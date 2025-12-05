import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TopicDto } from './dto/topic.dto';
import { CategoryService } from 'src/category/category.service';
import { TopicSearchDto } from './dto/topic.search.dto';
import { ContentDto } from './dto/content.dto';
import * as gTTS from 'node-gtts';
import * as fs from 'fs';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class TopicService {
    constructor (
        private readonly prismaService: PrismaService,
        private readonly categoryService: CategoryService,
        private storageService: StorageService,
    ) {}

    async verifyTopic(id: string) {
        const topic = await this.prismaService.topic.findFirst({
            where: { id },
        });

        if (!topic) {
            throw new HttpException(
                'Temat nie znaleziony',
                HttpStatus.NOT_FOUND,
            );
        }
    }

    async verifyUniqueTitle(categoryId: string, title: string) {
        const topic = await this.prismaService.topic.findFirst({
            where: {
                title,
                categoryId
            }
        });

        if (topic) {
            throw new HttpException(
                'Taki temat już istnieje',
                HttpStatus.CONFLICT,
            );
        }
    }

    async findAll(categoryId: string, dto: TopicSearchDto) {
        await this.categoryService.verifyCategory(categoryId);

        const result = await this.prismaService.topic.findMany({
            select: {
                id: true,
                title: true
            },
            where: {
                categoryId,
                ...(dto?.title && dto.title.trim() !== ''
                    ? {
                        title: {
                            contains: dto.title,
                            mode: 'insensitive',
                        },
                    }
                : {}),
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        if (!result) {
            return null;
        }

        return result;
    }

    async findById(categoryId: string, id: string) {
        await this.categoryService.verifyCategory(categoryId);
        await this.verifyTopic(id);

        const current = await this.prismaService.topic.findFirst({
            select: {
                id: true,
                title: true,
                audioUrl: true,
                content: true,
                createdAt: true
            },
            where: {
                categoryId,
                id,
            },
        });

        if (!current) {
            throw new HttpException(
                'Temat nie znaleziony',
                HttpStatus.NOT_FOUND,
            );
        }

        const behavior = await this.prismaService.topic.findFirst({
            select: {
                id: true,
                title: true,
                content: true,
                audioUrl: true
            },
            where: {
                categoryId,
                createdAt: { lt: current.createdAt },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const next = await this.prismaService.topic.findFirst({
            select: {
                id: true,
                title: true,
                content: true,
                audioUrl: true
            },
            where: {
                categoryId,
                createdAt: { gt: current.createdAt },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return {
            current,
            behavior,
            next,
        };
    }

    async create(categoryId: string, dto: TopicDto) {
        await this.categoryService.verifyCategory(categoryId);
        await this.verifyUniqueTitle(categoryId, dto.title);

        const result = await this.prismaService.topic.create({
            data: {
                title: dto.title,
                categoryId
            }
        });

        if (!result) {
            return null;
        }

        return result;
    }

    async update(categoryId: string, id: string, dto: TopicDto) {
        await this.categoryService.verifyCategory(categoryId);
        await this.verifyTopic(id);
        await this.verifyUniqueTitle(categoryId, dto.title);

        const result = await this.prismaService.topic.update({
            where: { id },
            data: {
                title: dto.title,
            }
        });

        if (!result) {
            return null;
        }

        return result;
    }

    async delete(categoryId: string, id: string) {
        await this.categoryService.verifyCategory(categoryId);
        await this.verifyTopic(id);

        const result = await this.prismaService.topic.delete({
            where: { id },
        });

        if (!result) {
            return null;
        }

        return result;
    }

    async getNotes(categoryId: string, id: string) {
        await this.categoryService.verifyCategory(categoryId);
        await this.verifyTopic(id);

        const result = await this.prismaService.topic.findFirst({
            select: {
                content: true,
                audioUrl: true
            },
            where: {
                categoryId,
                id,
            },
        });

        if (!result) {
            return null;
        }

        return result;
    }

    async updateNotes(categoryId: string, id: string, dto: ContentDto) {
        try {
            await this.categoryService.verifyCategory(categoryId);
            await this.verifyTopic(id);

            if (!dto.content || dto.content.trim() === '') {
                throw new Error('Content is empty');
            }

            const currentTopic = await this.prismaService.topic.findUnique({
                where: { id, categoryId },
                select: { audioUrl: true }
            });

            if (!currentTopic) {
                throw new Error('Topic not found');
            }

            await this.prismaService.topic.update({
                where: { id, categoryId },
                data: { content: dto.content }
            });

            const textForAudio = this.prepareTextForGTTS(dto.content);
            
            const audioBuffer = await this.generateAudioStable(textForAudio, 'pl');

            if (currentTopic.audioUrl) {
                const oldKey = currentTopic.audioUrl.split('/').pop();
                if (oldKey) {
                    try {
                        await this.storageService.deleteFile(oldKey);
                    } catch (deleteErr) {
                        // Ignore
                    }
                }
            }

            const audioKey = `${id}.mp3`;
            const audioUrl = await this.storageService.uploadBuffer(
                audioBuffer,
                audioKey,
                'audio/mpeg',
            );

            const finalResult = await this.prismaService.topic.update({
                where: { id, categoryId },
                data: { audioUrl },
                select: { 
                    content: true, 
                    audioUrl: true,
                    id: true,
                    title: true,
                },
            });

            return finalResult;

        } catch (error: unknown) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Unknown error occurred');
        }
    }

    private prepareTextForGTTS(text: string): string {
        return text
            .replace(/^\uFEFF/, '')
            .replace(/[\u200B-\u200F\uFEFF]/g, '')
            
            // ==================== EKA.05 - Prowadzenie dokumentacji w jednostce organizacyjnej ====================
            .replace(/\bEKA\.05\b/gi, 'EKA punkt zero pięć')
            .replace(/\bEKA-05\b/gi, 'EKA zero pięć')
            .replace(/\bEE\.05\b/gi, 'EE punkt zero pięć')
            .replace(/\bEE-05\b/gi, 'EE zero pięć')
            
            // ==================== EKA.07 - Prowadzenie rachunkowości ====================
            .replace(/\bEKA\.07\b/gi, 'EKA punkt zero siedem')
            .replace(/\bEKA-07\b/gi, 'EKA zero siedem')
            .replace(/\bEE\.07\b/gi, 'EE punkt zero siedem')
            .replace(/\bEE-07\b/gi, 'EE zero siedem')
            
            // ==================== Kwalifikacje i egzaminy ====================
            .replace(/\bkwalifikacja\s+w\s+zawodzie\b/gi, 'kwalifikacja w zawodzie')
            .replace(/\btechnik\s+rachunkowości\b/gi, 'technik rachunkowości')
            .replace(/\btechnik\s+ekonomista\b/gi, 'technik ekonomista')
            .replace(/\bkształcenie\s+zawodowe\b/gi, 'kształcenie zawodowe')
            .replace(/\begzamin\s+zawodowy\b/gi, 'egzamin zawodowy')
            .replace(/\begzamin\s+potwierdzający\b/gi, 'egzamin potwierdzający kwalifikacje')
            .replace(/\bświadectwo\s+kwalifikacyjne\b/gi, 'świadectwo kwalifikacyjne')
            .replace(/\bdyplom\s+potwierdzający\b/gi, 'dyplom potwierdzający kwalifikacje')
            
            // ==================== Dokumentacja jednostki organizacyjnej (EKA.05) ====================
            .replace(/\bdokumentacja\s+jednostki\b/gi, 'dokumentacja jednostki organizacyjnej')
            .replace(/\bjednostka\s+organizacyjna\b/gi, 'jednostka organizacyjna')
            .replace(/\bdokumenty\s+podstawowe\b/gi, 'dokumenty podstawowe działalności')
            .replace(/\bdokumenty\s+ksiegowe\b/gi, 'dokumenty księgowe')
            .replace(/\bdokumenty\s+kadrowe\b/gi, 'dokumenty kadrowe')
            .replace(/\bdokumenty\s+magazynowe\b/gi, 'dokumenty magazynowe')
            .replace(/\bdokumenty\s+sprzedaży\b/gi, 'dokumenty sprzedaży')
            .replace(/\bdokumenty\s+zakupu\b/gi, 'dokumenty zakupu')
            
            // ==================== Obsługa kadrowo-płacowa ====================
            .replace(/\bumowa\s+o\s+pracę\b/gi, 'umowa o pracę')
            .replace(/\bumowa\s+zlecenie\b/gi, 'umowa zlecenie')
            .replace(/\bumowa\s+o\s+dzieło\b/gi, 'umowa o dzieło')
            .replace(/\bświadectwo\s+pracy\b/gi, 'świadectwo pracy')
            .replace(/\bzaświadczenie\s+o\s+zarobkach\b/gi, 'zaświadczenie o zarobkach')
            .replace(/\bdeklaracja\s+ZUS\s+(\w+)/gi, 'deklaracja ZUS $1')
            .replace(/\bZUS\s+DRA\b/gi, 'ZUS D R A')
            .replace(/\bZUS\s+RSA\b/gi, 'ZUS R S A')
            .replace(/\bZUS\s+ZUA\b/gi, 'ZUS Z U A')
            .replace(/\bZUS\s+ZZA\b/gi, 'ZUS Z Z A')
            .replace(/\bZUS\s+ZIA\b/gi, 'ZUS Z I A')
            .replace(/\bPIT-(\d+)\b/gi, 'PIT $1')
            .replace(/\bPIT\s+(\d+[A-Z]?)\b/gi, 'PIT $1')
            .replace(/\blist\s+płac\b/gi, 'list płac')
            .replace(/\bkarta\s+wynagrodzeń\b/gi, 'karta wynagrodzeń')
            .replace(/\bwynagrodzenie\s+brutto\b/gi, 'wynagrodzenie brutto')
            .replace(/\bwynagrodzenie\s+netto\b/gi, 'wynagrodzenie netto')
            .replace(/\bskładki\s+ZUS\b/gi, 'składki Z U S')
            .replace(/\bpodatek\s+dochodowy\b/gi, 'podatek dochodowy')
            .replace(/\bzaliczka\s+na\s+PIT\b/gi, 'zaliczka na P I T')
            
            // ==================== Dokumenty magazynowe i towarowe ====================
            .replace(/\bdokument\s+WZ\b/gi, 'dokument wydania zewnętrznego')
            .replace(/\bdokument\s+PZ\b/gi, 'dokument przyjęcia zewnętrznego')
            .replace(/\bdokument\s+RW\b/gi, 'dokument rozchodu wewnętrznego')
            .replace(/\bdokument\s+PW\b/gi, 'dokument przyjęcia wewnętrznego')
            .replace(/\bdokument\s+MM\b/gi, 'dokument przesunięcia międzymagazynowego')
            .replace(/\bdokument\s+FV\b/gi, 'faktura VAT')
            .replace(/\bdokument\s+FZ\b/gi, 'faktura zakupu')
            .replace(/\bdokument\s+FS\b/gi, 'faktura sprzedaży')
            .replace(/\bkarta\s+magazynowa\b/gi, 'karta magazynowa')
            .replace(/\brejestr\s+magazynowy\b/gi, 'rejestr magazynowy')
            .replace(/\bwzór\s+dokumentu\b/gi, 'wzór dokumentu')
            
            // ==================== Sprawozdawczość statystyczna ====================
            .replace(/\bsprawozdanie\s+statystyczne\b/gi, 'sprawozdanie statystyczne')
            .replace(/\bformularz\s+statystyczny\b/gi, 'formularz statystyczny')
            .replace(/\bGUS\s+(\w+-\d+)/gi, 'G U S formularz $1')
            .replace(/\bformularz\s+GUS\b/gi, 'formularz G U S')
            
            // ==================== Rachunkowość (EKA.07) ====================
            .replace(/\bprowadzenie\s+rachunkowości\b/gi, 'prowadzenie rachunkowości')
            .replace(/\bksięgi\s+rachunkowe\b/gi, 'księgi rachunkowe')
            .replace(/\bdziennik\s+ksiegowy\b/gi, 'dziennik księgowy')
            .replace(/\bksięga\s+główna\b/gi, 'księga główna')
            .replace(/\bksięgi\s+pomocnicze\b/gi, 'księgi pomocnicze')
            .replace(/\bzakładowy\s+plan\s+kont\b/gi, 'zakładowy plan kont')
            .replace(/\bZPK\b/gi, 'Zakładowy Plan Kont')
            .replace(/\bpolityka\s+rachunkowości\b/gi, 'polityka rachunkowości')
            .replace(/\binstrukcja\s+obiegu\s+dokumentów\b/gi, 'instrukcja obiegu dokumentów')
            .replace(/\binstrukcja\s+inwentaryzacyjna\b/gi, 'instrukcja inwentaryzacyjna')
            
            // ==================== Podatki i rozliczenia (EKA.07) ====================
            .replace(/\brozliczenia\s+podatkowe\b/gi, 'rozliczenia podatkowe')
            .replace(/\bdeklaracja\s+VAT\b/gi, 'deklaracja V A T')
            .replace(/\bVAT-(\d+[A-Z]?)\b/gi, 'VAT $1')
            .replace(/\bJPK_VAT\b/gi, 'Jednolity Plik Kontrolny VAT')
            .replace(/\bJPK_KR\b/gi, 'Jednolity Plik Kontrolny Księgi Rachunkowej')
            .replace(/\bdeklaracja\s+CIT\b/gi, 'deklaracja C I T')
            .replace(/\bCIT-(\d+)\b/gi, 'C I T $1')
            .replace(/\bdeklaracja\s+PIT\b/gi, 'deklaracja P I T')
            .replace(/\bzaliczki\s+na\s+podatki\b/gi, 'zaliczki na podatki')
            .replace(/\bpodatek\s+dochodowy\s+od\s+osób\s+prawnych\b/gi, 'podatek dochodowy od osób prawnych')
            .replace(/\bpodatek\s+dochodowy\s+od\s+osób\s+fizycznych\b/gi, 'podatek dochodowy od osób fizycznych')
            
            // ==================== Sprawozdania finansowe (EKA.07) ====================
            .replace(/\bsprawozdanie\s+finansowe\b/gi, 'sprawozdanie finansowe')
            .replace(/\bbilans\b/gi, 'bilans')
            .replace(/\brachunek\s+zysku\s+i\s+straty\b/gi, 'rachunek zysków i strat')
            .replace(/\binformacja\s+dodatkowa\b/gi, 'informacja dodatkowa')
            .replace(/\bsprawozdanie\s+z\s+przepływów\s+pieniężnych\b/gi, 'sprawozdanie z przepływów pieniężnych')
            .replace(/\bsprawozdanie\s+z\s+zmian\s+w\s+kapitale\s+własnym\b/gi, 'sprawozdanie ze zmian w kapitale własnym')
            .replace(/\bzestawienie\s+zmian\s+w\s+kapitale\s+własnym\b/gi, 'zestawienie zmian w kapitale własnym')
            
            // ==================== Inwentaryzacja (EKA.07) ====================
            .replace(/\binwentaryzacja\b/gi, 'inwentaryzacja')
            .replace(/\bspis\s+z\s+natury\b/gi, 'spis z natury')
            .replace(/\bpotwierdzenie\s+sald\b/gi, 'potwierdzenie sald')
            .replace(/\bweryfikacja\s+dokumentacyjna\b/gi, 'weryfikacja dokumentacyjna')
            .replace(/\bprotokół\s+inwentaryzacyjny\b/gi, 'protokół inwentaryzacyjny')
            .replace(/\brozbieżności\s+inwentaryzacyjne\b/gi, 'rozbieżności inwentaryzacyjne')
            .replace(/\bujęcia\s+inwentaryzacyjne\b/gi, 'ujęcia inwentaryzacyjne')
            
            // ==================== Środki trwałe i wartości niematerialne ====================
            .replace(/\bśrodek\s+trwały\b/gi, 'środek trwały')
            .replace(/\bwartość\s+niematerialna\b/gi, 'wartość niematerialna')
            .replace(/\bkarta\s+środka\s+trwałego\b/gi, 'karta środka trwałego')
            .replace(/\bamortyzacja\b/gi, 'amortyzacja')
            .replace(/\bumorzenie\b/gi, 'umorzenie')
            .replace(/\bksięga\s+inwentarzowa\b/gi, 'księga inwentarzowa')
            
            // ==================== Praktyka zawodowa i staże ====================
            .replace(/\bpraktyka\s+zawodowa\b/gi, 'praktyka zawodowa')
            .replace(/\bstaż\s+zawodowy\b/gi, 'staż zawodowy')
            .replace(/\bdziennik\s+praktyk\b/gi, 'dziennik praktyk')
            .replace(/\bportfolio\s+zawodowe\b/gi, 'portfolio zawodowe')
            .replace(/\bumowa\s+o\s+praktyki\b/gi, 'umowa o praktyki')
            .replace(/\bświadectwo\s+odbycia\s+praktyk\b/gi, 'świadectwo odbycia praktyk')
            
            // ==================== Materiały dydaktyczne ====================
            .replace(/\bpodręcznik\s+szkoleniowy\b/gi, 'podręcznik szkoleniowy')
            .replace(/\bmateriały\s+dydaktyczne\b/gi, 'materiały dydaktyczne')
            .replace(/\bćwiczenia\s+praktyczne\b/gi, 'ćwiczenia praktyczne')
            .replace(/\bzadania\s+egzaminacyjne\b/gi, 'zadania egzaminacyjne')
            .replace(/\barkusz\s+egzaminacyjny\b/gi, 'arkusz egzaminacyjny')
            .replace(/\bstandardy\s+egzaminacyjne\b/gi, 'standardy egzaminacyjne')
            .replace(/\bkryteria\s+oceniania\b/gi, 'kryteria oceniania')
            
            // ==================== Krajowe Ramy Kwalifikacji ====================
            .replace(/\bKrajowe\s+Ram[yi]\s+Kwalifikacji\b/gi, 'Krajowe Ramy Kwalifikacji')
            .replace(/\bKRK\b/gi, 'Krajowe Ramy Kwalifikacji')
            .replace(/\bPolska\s+Rama\s+Kwalifikacji\b/gi, 'Polska Rama Kwalifikacji')
            .replace(/\bPRK\b/gi, 'Polska Rama Kwalifikacji')
            .replace(/\bpoziom\s+kwalifikacji\b/gi, 'poziom kwalifikacji')
            .replace(/\bpoziom\s+(\d+)\s+PRK\b/gi, 'poziom $1 Polskiej Ramy Kwalifikacji')
            
            // ==================== Standardowe skróty ====================
            .replace(/\bPKPiR\b/gi, 'Podatkowa Księga Przychodów i Rozchodów')
            .replace(/\bRK\b/gi, 'Rachunek Kosztów')
            .replace(/\bKPiR\b/gi, 'Księga Przychodów i Rozchodów')
            .replace(/\bKP\b/gi, 'Księga Przychodów')
            .replace(/\bKR\b/gi, 'Księga Rachunkowa')
            .replace(/\bKW\b/gi, 'Księga Wpływów')
            .replace(/\bŚT\b/gi, 'Środek Trwały')
            .replace(/\bWNiP\b/gi, 'Wartości Niematerialne i Prawne')
            .replace(/\bRZiS\b/gi, 'Rachunek Zysków i Strat')
            
            // ==================== Słowniczek pojęć ====================
            .replace(/\bdebet\b/gi, 'Winien')
            .replace(/\bcredit\b/gi, 'Ma')
            .replace(/\bDt\b/gi, 'Winien')
            .replace(/\bCt\b/gi, 'Ma')
            .replace(/\bWN\b/gi, 'Winien')
            .replace(/\bMA\b/gi, 'Ma')
            .replace(/\bsaldo\b/gi, 'saldo')
            .replace(/\bobrót\b/gi, 'obrót')
            .replace(/\bnależność\b/gi, 'należność')
            .replace(/\bzobowiązanie\b/gi, 'zobowiązanie')
            .replace(/\bprzychód\b/gi, 'przychód')
            .replace(/\bkoszt\b/gi, 'koszt')
            .replace(/\bwydatek\b/gi, 'wydatek')
            .replace(/\bdochód\b/gi, 'dochód')
            .replace(/\bstrat[ay]\b/gi, 'strata')
            .replace(/\bzysk\b/gi, 'zysk')
            
            // ==================== Data i czas ====================
            .replace(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g, '$1 $2 $3 roku')
            .replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, '$1 $2 $3 roku')
            .replace(/(\d{1,2})-(\d{1,2})-(\d{4})/g, '$1 $2 $3 roku')
            
            // ==================== Formatowanie tekstu ====================
            .replace(/^(\d+)\.\s+/gm, 'Punkt $1: ')
            .replace(/(\n)(\d+)\.\s+/g, '$1Punkt $2: ')
            .replace(/^-\s+/gm, '• ')
            .replace(/^–\s+/gm, '• ')
            .replace(/\(([^)]+)\)/g, '- $1')
            .replace(/\[([^\]]+)\]/g, '- $1')
            
            // ==================== Normalizacja ====================
            .replace(/\s+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
            
            // ==================== Dodanie kontekstu ====================
            .replace(/^/, 'Materiały szkoleniowe dla technika rachunkowości. ')
            .replace(/$/, ' Koniec materiału szkoleniowego.');
    }

    private generateAudioStable(text: string, lang: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const gtts = gTTS(lang);
                const tempFile = `temp_audio_${Date.now()}.mp3`;
                
                gtts.save(tempFile, text, () => {
                    try {
                        if (!fs.existsSync(tempFile)) {
                            return reject(new Error('Audio file was not created'));
                        }
                        
                        const buffer = fs.readFileSync(tempFile);
                        
                        if (buffer.length < 1024) {
                            fs.unlinkSync(tempFile);
                            return reject(new Error('Audio file too small'));
                        }
                        
                        fs.unlinkSync(tempFile);
                        resolve(buffer);
                        
                    } catch (fsError: unknown) {
                        if (fs.existsSync(tempFile)) {
                            try {
                                fs.unlinkSync(tempFile);
                            } catch {
                                // Ignore
                            }
                        }
                        const errorMessage = fsError instanceof Error 
                            ? fsError.message 
                            : 'Unknown file system error';
                        reject(new Error(`File error: ${errorMessage}`));
                    }
                });
                
            } catch (error: unknown) {
                const errorMessage = error instanceof Error 
                    ? error.message 
                    : 'Unknown initialization error';
                reject(new Error(`Audio generation failed: ${errorMessage}`));
            }
        });
    }
}
