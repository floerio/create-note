import { Plugin, Vault, TFile, normalizePath, Notice } from 'obsidian';
import { join, basename, extname } from 'path';
import { simpleParser, ParsedMail } from 'mailparser';

interface CreateNoteSettings {
    inputFolderPath: string;
    noteFolderPath: string;
    attachementFolderPath: string;
    useTemplate: boolean;
    templateFolderPath: string;
    importTemplate: string;
}
export default class HandleNewFiles {

    theFile: TFile;
    settings: CreateNoteSettings;

    constructor(pTheFile: TFile, pSettings: CreateNoteSettings) {
        this.theFile = pTheFile;
        this.settings = pSettings;
    }

    handleFile(): void {

        const sourceFile = join(this.settings.inputFolderPath + "/", fileName);
        const targetFile = join(this.settings.attachementFolderPath + "/", fileName);


        try {
            // first move the file to the attachments folder 
            const fileToRename = this.app.vault.getFileByPath(sourceFile);
            if (!fileToRename) {
                throw new Error(`File not found: ${sourceFile}`);
            }
            await this.app.vault.rename(fileToRename, targetFile);

            // Generate a safe note title from filename (removing extension)
            const noteTitle = createDatePrefix() + " " + basename(fileName, extname(fileName)).replace(/[^\w\s-]/g, '');
            const notePath = join(this.settings.noteFolderPath, noteTitle + ".md");

            // create the content of the note: blank or by using a template
            let noteContent = "";
            // check if template is set
            if (this.settings.useTemplate) {
                // Create note content with template and file link
                noteContent = await this.createNoteContent();
            }

            // add the file attachement link
            noteContent += `\n\n![[${targetFile}]]`;

            // Finally create the note file in vault
            await this.app.vault.create(notePath, noteContent);

            new Notice(`Created note for: ${fileName}`);

        } catch (error) {
            console.error(`Error processing file: `, error);
            new Notice(`Error processing ${fileName}: ${error.message}`);
        }
    }


}