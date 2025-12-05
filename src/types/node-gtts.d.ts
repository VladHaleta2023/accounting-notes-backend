declare module 'node-gtts' {
    const gTTS: (lang: string) => {
        stream: (text: string) => NodeJS.ReadableStream;
        save: (filepath: string, text: string, callback: () => void) => void;
    };
    export = gTTS;
}