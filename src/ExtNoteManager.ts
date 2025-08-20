import { App, Editor, MarkdownView, Modal, Notice, Plugin, Menu, MenuItem, PluginSettingTab, Setting, AbstractInputSuggest, TFolder, TFile, normalizePath } from 'obsidian';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, copyFile } from 'fs';
import { join, basename, extname } from 'path';
import * as path from 'path';
import { nanoid } from 'nanoid';
import { simpleParser, ParsedMail } from 'mailparser';

interface CreateNoteSettings {
    inputFolderPath: string;
    noteFolderPath: string;
    attachementFolderPath: string;
    useTemplate: boolean;
    templateFolderPath: string;
    importTemplate: string;
    deleteEmlFiles: boolean;
    attachEmlFile: boolean;
    ignoreHiddenFiles: boolean;
}

interface Frontmatter {
    created?: string;
    [key: string]: any;
}
export class ExtNoteManager {
    myApp: string;
    app: App;
    settings: CreateNoteSettings;
    vaultBasePath: string;
    noteContent: string;
    noteUUID: string;

    constructor(app: App, settings: CreateNoteSettings) {

        this.app = app;
        this.settings = settings;

        // Check if required folders exisit
        if (!this.ensureAllFoldersExist(this.settings)) {
            throw ("Settings not correct")
        }

        // define base path for vault
        this.vaultBasePath = (this.app.vault.adapter as any).basePath;

        // initilize the basic attributes
        this.noteContent = "";
        this.noteUUID = "";
    }

    // main loop over input files
    async createNotesForFiles() {

        // get base path for the vault
        const inputFolderPath = normalizePath(this.vaultBasePath + '/' + this.settings.inputFolderPath);
        const files = readdirSync(inputFolderPath);
        let processedCount = 0;

        // handle each file
        for (const file of files) {

            // create file name
            const inputFileName = join(inputFolderPath + "/", file);

            // Skip directories
            if (statSync(inputFileName).isDirectory()) continue;

            // skip hidden files if required
            if (this.settings.ignoreHiddenFiles && file.startsWith('.')) continue;

            // read file
            const inputFile = this.app.vault.getAbstractFileByPath(inputFileName);

            if (!(inputFile instanceof TFile)) {
                throw new Error(`Can't read file: ${inputFileName}`);
            }

            // file seems to exists as expected, so process it
            await this.createNoteFromFile(inputFile);

            processedCount++;
        }

        new Notice(`Processed ${processedCount} files`);
    }


    async createNoteFromFile(inputFile: TFile) {

        // create unique identifier for note
        const uuid = nanoid();

        // create initial note content with template
        await this.useTemplateForContent(uuid)

        // create the content part from the file
        await this.createNoteContent(inputFile);

        // collect all attachments


        // move attachements to attachments folder


        // use template if required for contentd


        // add links to attachements to content

        // move attachement files

        // create new note with contents


    }

    // load template into the content if requested
    async useTemplateForContent(noteId: string) {
        if (!this.settings.useTemplate) {
            return;
        } else {

            try {

                // get the template file
                const templateFileName = join(this.settings.templateFolderPath + "/", this.settings.importTemplate)
                const templateFile = this.app.vault.getFileByPath(templateFileName);

                // template found?
                if (!(templateFile instanceof TFile)) {
                    throw new Error(`Template file not found: ${templateFileName}`);
                }

                // load the content of the template file into our main content
                this.noteContent = await this.app.vault.read(templateFile);

                const formattedDate = this.getFormattedISODate();

                // replace the template placeholder in the content
                this.noteContent = this.noteContent.replace(/%date%/g, formattedDate);
                this.noteContent = this.noteContent.replace(/%id%/g, noteId);

                return;

            } catch (error) {
                console.error("Failed to create note content: ", error);
                new Notice("Unable to create note content");
            }
        }
    }

    // create the major content 
    // currently only relevant for eml files, all other files will have no major content
    async createNoteContent(inputFile: TFile) {
        // if we do not have an eml file, we don't have any content
        if (inputFile.extension != "eml") {
            this.noteContent = "";
        }
        else {
            try {
                // read the file
                const emlBuffer = await this.app.vault.readBinary(inputFile);
                const nodeBuffer = Buffer.from(emlBuffer); // Node.js Buffer

                // Parse the content
                const parsed: ParsedMail = await simpleParser(nodeBuffer);

                // create the content of the note
                this.noteContent += `**Subject: ${parsed.subject || 'No Subject'}**\n\n${parsed.text}\n`;
            }
            catch (error) {
                console.log("Error parsing eml file: " + error);
                throw (error);
            }

        }


    }

    getFormattedISODate(): string {
        const date = new Date();

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Add 1 because months are 0-indexed
        const day = String(date.getDate()).padStart(2, '0');

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        const isoDate = `${year}-${month}-${day} ${hours}:${minutes}`;

        return isoDate;
    }


    async ensureAllFoldersExist(mySettings: CreateNoteSettings): Promise<boolean> {

        // Array of [folderPath, errorMessage]
        const checks: [string, string][] = [
            [mySettings.attachementFolderPath, `Folder ${mySettings.attachementFolderPath} does not exist`],
            [mySettings.inputFolderPath, `Folder ${mySettings.inputFolderPath} does not exist`],
            [mySettings.noteFolderPath, `Folder ${mySettings.noteFolderPath} does not exist`],
            [mySettings.templateFolderPath, `Folder ${mySettings.templateFolderPath} does not exist`]
        ];

        // If template should be used, add it to the checks array
        if (mySettings.useTemplate) {
            checks.push([
                `${mySettings.templateFolderPath}/${mySettings.importTemplate}`,
                `Template ${mySettings.importTemplate} does not exist`
            ]);
        }

        for (const [path, msg] of checks) {
            if (!await this.app.vault.adapter.exists(path)) {
                new Notice(msg);
                return false;
            }
        }

        return true;
    }



    //
    // -----------------------------------
    //
    async renameNoteWithCreatedDate(file: TFile) {
        try {
            // Read file content
            const content = await this.app.vault.read(file);

            // Extract frontmatter
            const frontmatterMatch = content.match(/^---[\s\S]*?---/);
            if (!frontmatterMatch) {
                new Notice('No frontmatter found in the note');
                return;
            }

            const frontmatterStr = frontmatterMatch[0];
            const frontmatter: Frontmatter = this.parseFrontmatter(frontmatterStr);

            if (!frontmatter.created) {
                new Notice('No "created" date found in frontmatter');
                return;
            }

            // Get date prefix based on 'created' entry in frontmatter
            const datePrefix = this.formatDateForFilename(frontmatter.created);

            // Generate new filename
            const currentName = file.basename;
            const newName = `${datePrefix} ${currentName}`;

            const pathPrefix = file.parent ? `${file.parent.path}/` : '';

            const renamedFile = `${pathPrefix}${newName}.${file.extension}`;

            // Rename the file
            await this.app.fileManager.renameFile(
                file,
                renamedFile
            );

            new Notice(`Note renamed to: ${newName}`);

        } catch (error) {
            new Notice(`Error renaming note: ${error}`);
            console.error(error);
        }
    }

    private parseFrontmatter(frontmatterStr: string): Frontmatter {
        const result: Frontmatter = {};
        const lines = frontmatterStr.split('\n').slice(1, -1); // Remove --- lines

        for (const line of lines) {
            const match = line.match(/^(\w+):\s*(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim();
                result[key] = value;
            }
        }

        return result;
    }

    private formatDateForFilename(dateStr: string): string {

        // Remove all whitespace
        const cleanDate = dateStr.trim();

        // Handle YYYY-MM-DD format (e.g., "2023-08-20")
        if (cleanDate.match(/^\d{4}-\d{2}-\d{2}/)) {
            return cleanDate.replace(/-/g, '').slice(0, 8);
        }
        // Handle DD.MM.YYYY format (e.g., "20.08.2023")
        else if (cleanDate.match(/^\d{2}\.\d{2}\.\d{4}$/)) {

            const parts = cleanDate.split('.');
            // Rearrange from DD.MM.YYYY to YYYYMMDD
            return `${parts[2]}${parts[1]}${parts[0]}`;
        }

        return "";
    }


}