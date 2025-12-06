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

            const currentTopic = await this.prismaService.topic.findUnique({
                where: { id, categoryId },
                select: { audioUrl: true, content: true }
            });

            if (!currentTopic) {
                throw new Error('Topic not found');
            }

            // Сохраняем контент в любом случае
            await this.prismaService.topic.update({
                where: { id, categoryId },
                data: { content: dto.content }
            });

            const textForAudio = this.prepareTextForGTTS(dto.content || "");
            
            let audioUrl = currentTopic.audioUrl;
            
            // Если после очистки текст не пустой - генерируем аудио
            if (textForAudio && textForAudio.trim() !== '') {
                try {
                    const audioBuffer = await this.generateAudioStable(textForAudio, 'pl');
                    
                    // Удаляем старое аудио если есть
                    if (currentTopic.audioUrl) {
                        const oldKey = currentTopic.audioUrl.split('/').pop();
                        if (oldKey) {
                            try {
                                await this.storageService.deleteFile(oldKey);
                            } catch (deleteErr) {
                                // Игнорируем ошибку удаления
                                console.warn('Failed to delete old audio:', deleteErr);
                            }
                        }
                    }
                    
                    // Загружаем новое аудио
                    const audioKey = `${id}.mp3`;
                    audioUrl = await this.storageService.uploadBuffer(
                        audioBuffer,
                        audioKey,
                        'audio/mpeg',
                    );
                    
                } catch (audioError: unknown) {
                    // Если не удалось сгенерировать аудио, оставляем старое или null
                    console.error('Failed to generate audio:', audioError);
                    // Не выбрасываем ошибку - сохраняем текст без аудио
                }
            } else {
                // Если текст пустой после очистки - удаляем аудио если было
                if (currentTopic.audioUrl) {
                    const oldKey = currentTopic.audioUrl.split('/').pop();
                    if (oldKey) {
                        try {
                            await this.storageService.deleteFile(oldKey);
                        } catch (deleteErr) {
                            console.warn('Failed to delete audio:', deleteErr);
                        }
                    }
                    audioUrl = "";
                }
            }

            // Обновляем запись с новым аудио (или null если не удалось сгенерировать)
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
        const cleanedText = text
            .replace(/[➔➜➤►▶▷❯›»→←↔↕↑↓↗↘↙↖]/gu, ' ')
            .replace(/[●○◆◇■□▲△▼▽★☆✦✧❖♠♥♦♣♩♪♫♬]/gu, ' ')
            .replace(/[✓✔✕✗✘✅❌]/gu, ' ')
            // eslint-disable-next-line no-misleading-character-class
            .replace(/[🖊️✏️📝📄📋📎📌🔖🏷️]/gu, ' ')
            .replace(/[\u2000-\u206F\u2E00-\u2E7F]/gu, ' ')
            
            .replace(/^[\s\u00A0]*[•\-–—*·▪▫▶›»➤➔]\s*/gm, '')
            .replace(/^[\s\u00A0]*[\dIVXLCDMivxlcdm]+[.)]\s*/gm, '')
            .replace(/^[\s\u00A0]*[a-z]\)\s*/gim, '')
            .replace(/\s+[•\-–—*]\s+/g, ' ')

            // ==================== Normalizacja ====================
            .replace(/\s+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        
        // Проверяем, не состоит ли текст только из знаков препинания или пробелов
        const hasMeaningfulContent = cleanedText && 
            cleanedText.trim() !== '' && 
            cleanedText.replace(/[^\p{L}\p{N}]/gu, '').length > 0;
        
        return hasMeaningfulContent ? cleanedText : '';
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
