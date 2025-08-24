import { App, Notice, TFolder, TFile, normalizePath } from 'obsidian';
import { readdirSync  } from 'fs';
import { join  } from 'path';
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
    attachEmlFile: boolean;
    ignoreHiddenFiles: boolean;
}

interface Frontmatter {
    created?: string;
    [key: string]: any;
}
export class ExtNoteManager {
    #app: App;
    #settings: CreateNoteSettings;
    #vaultBasePath: string;
    #noteContent: string;
    #noteUUID: string;
    #attachementList: string[] = [];

    constructor(app: App, settings: CreateNoteSettings) {

        this.#app = app;
        this.#settings = settings;

        // Check if required folders exisit
        if (!this.ensureAllFoldersExist(this.#settings)) {
            throw ("Settings not correct")
        }

        // define base path for vault
        this.#vaultBasePath = (this.#app.vault.adapter as any).basePath;

        // initilize the basic attributes
        this.#noteContent = "";
        this.#noteUUID = "";
    }

    //
    // main loop over input files
    //
    public async createNotesForFiles() {

        // get base path for the vault
        const inputFolderPath = normalizePath(this.#vaultBasePath + '/' + this.#settings.inputFolderPath);
        const files = readdirSync(inputFolderPath);
        let processedCount = 0;

        try {
            // handle each file
            for (const file of files) {

                // skip hidden files if required
                if (this.#settings.ignoreHiddenFiles && file.startsWith('.')) continue;

                const vaultInputFileName = join(this.#settings.inputFolderPath + "/", file);

                // read file
                const inputFile = this.#app.vault.getAbstractFileByPath(vaultInputFileName);

                // Skip directories
                if (inputFile instanceof TFolder) continue;

                if (!(inputFile instanceof TFile)) {
                    throw new Error(`Can't read file: ${vaultInputFileName}`);
                }

                // file seems to exists as expected, so process it
                await this.createNoteFromFile(inputFile);

                processedCount++;
            }
            new Notice(`Processed ${processedCount} files`);

            return;

        } catch (error) {
            console.log("Error in looping files " + error)
        }
    }

    //
    // main process for one file
    //
    private async createNoteFromFile(inputFile: TFile) {

        try {
            // create unique identifier for note
            this.#noteUUID = nanoid();

            // create initial note content with template
            await this.useTemplateForContent();

            // create the content part from the file
            await this.createNoteContent(inputFile);

            // move attachements to attachments folder
            const orgFilename = inputFile.basename;
            await this.moveFileToAttachmentFolder(inputFile);

            // add links to attachements to content
            this.addAttachmentsToContent();

            // create new note with contents
            await this.createFinalNote(orgFilename);

        } catch (error) {
            console.log("Error in main process for file: " + error)
            throw error;
        }
    }

    // load template into the content if requested
    private async useTemplateForContent() {
        if (!this.#settings.useTemplate) {
            return;
        } else {

            try {

                // get the template file
                const templateFileName = join(this.#settings.templateFolderPath + "/", this.#settings.importTemplate)
                const templateFile = this.#app.vault.getFileByPath(templateFileName);

                // template found?
                if (!(templateFile instanceof TFile)) {
                    throw new Error(`Template file not found: ${templateFileName}`);
                }

                // load the content of the template file into our main content
                this.#noteContent = await this.#app.vault.read(templateFile);

                const formattedDate = this.getFormattedISODate();

                // replace the template placeholder in the content
                this.#noteContent = this.#noteContent.replace(/%date%/g, formattedDate);
                this.#noteContent = this.#noteContent.replace(/%id%/g, this.#noteUUID);

                return;

            } catch (error) {
                console.error("Failed to use template: ", error);
                new Notice("Unable to use template");
            }
        }
    }

    // create the major content 
    // currently only relevant for eml files, all other files will have no major content
    private async createNoteContent(inputFile: TFile) {
        // if we do not have an eml file, we don't have any content
        if (inputFile.extension != "eml") {
            return;
        }
        else {
            try {
                // read the file
                const emlBuffer = await this.#app.vault.readBinary(inputFile);
                const nodeBuffer = Buffer.from(emlBuffer); // Node.js Buffer

                // Parse the content
                const parsed: ParsedMail = await simpleParser(nodeBuffer);

                // create the content of the note
                this.#noteContent += `**Subject: ${parsed.subject || 'No Subject'}**\n\n${parsed.text}\n`;
            }
            catch (error) {
                console.log("Error parsing eml file: " + error);
                throw (error);
            }

        }

    }

    // move input files to attachement foder, create eml files
    private async moveFileToAttachmentFolder(inputFile: TFile) {

        try {
            // handle eml files: extract the included files and move them to the attachement folder
            if (inputFile.extension = "eml") {
                // read eml content
                const emlBuffer = await this.#app.vault.readBinary(inputFile);
                const nodeBuffer = Buffer.from(emlBuffer); // Node.js Buffer

                // Parse the content
                const parsed: ParsedMail = await simpleParser(nodeBuffer);

                // create the eml-included attachement files directly in the attachements folder
                if (parsed.attachments && parsed.attachments.length > 0) {
                    for (const attach of parsed.attachments) {

                        // get file name and extension
                        const filename = attach.filename || '';
                        const ext = path.extname(filename);

                        // only proceed if we have an extension, assuming that files w/o extension are no serious attachements
                        if (ext) {
                            const newFilename = `${this.#noteUUID}_${filename}`
                            const attachPath = normalizePath(`${this.#settings.attachementFolderPath}/${newFilename}`);
                            // Convert Buffer to ArrayBuffer using Uint8Array
                            const arrayBuffer = new Uint8Array(attach.content).buffer;
                            await this.#app.vault.createBinary(attachPath, arrayBuffer as ArrayBuffer);
                            this.#attachementList.push(newFilename);
                        }
                    }
                }

                // if eml not required as attachement, then delete it and we are done
                if (!this.#settings.attachEmlFile) {
                    await this.#app.vault.delete(inputFile);
                    return;
                }

            }

            // so now we have either a non-eml file or an eml file that should be moved as well
            const sourceFile = join(this.#settings.inputFolderPath + "/", inputFile.name);
            const newFilename = `${this.#noteUUID}_${inputFile.name}`
            const targetFile = normalizePath(`${this.#settings.attachementFolderPath}/${newFilename}`);

            await this.moveFile(sourceFile, targetFile, false);

            this.#attachementList.push(newFilename);

        } catch (error) {
            new Notice("Unable to handle input file ");
            console.log("Unable to handle input file " + error);
            throw error;
        }

    }

    // update content with attachment list
    private addAttachmentsToContent() {
        this.#attachementList.forEach((element) => {
            const path = join(this.#settings.attachementFolderPath, element);
            this.#noteContent += `\n\n![[${path}]]`;
        });

        // clear for next file
        this.#attachementList = [];
    }

    //create the final note
    private async createFinalNote(fileName: string) {

        let noteTitle = this.createDatePrefix() + " " + fileName.replace(/[^\w\s-]/g, '');
        noteTitle =  join(this.#settings.noteFolderPath, noteTitle + ".md");

        // create it
        await this.#app.vault.create(noteTitle, this.#noteContent);
    }

    //
    // helper functions
    //

    // helper fuction to create prefix string
    private createDatePrefix(): string {
        // Create a new Date object
        const currentDate = new Date();

        // Get the year, month, and day components
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const day = String(currentDate.getDate()).padStart(2, '0');

        // Format the date as "YYYY-MM-DD"
        const formattedDate = `${year}-${month}-${day}`;

        return formattedDate;
    }

    private async moveFile(srcFile: string, targetFile: string, copyOnly: boolean) {
        const fileToRename = this.#app.vault.getFileByPath(srcFile);
        try {
            if (!fileToRename) {
                throw new Error(`File not found: ${srcFile}`);
            }
            if (copyOnly) {
                await this.#app.vault.copy(fileToRename, targetFile);
            } else {
                await this.#app.vault.rename(fileToRename, targetFile);
            }
        } catch (error) {
            console.error("File move failed: ", error);
            new Notice(`File move failed for ${srcFile}`);

        }
    }

    private sanitizeFileName(name: string): string {
        // Replace German Umlauts and sharp S with ASCII equivalents
        const umlautMap: Record<string, string> = {
            ä: "ae",
            ö: "oe",
            ü: "ue",
            Ä: "Ae",
            Ö: "Oe",
            Ü: "Ue",
            ß: "ss",
        };

        // Replace Umlauts first
        let sanitized = name.replace(/[äöüÄÖÜß]/g, (match) => umlautMap[match] || match);

        // Remove ALL spaces
        sanitized = sanitized.replace(/ /g, "");

        // Replace other invalid characters with underscores
        sanitized = sanitized
            .replace(/[/\\:*?"<>|]/g, "_")  // Replace invalid characters
            .replace(/^\./, "_");            // Avoid hidden files (e.g., ".file.md" -> "_file.md")

        return sanitized;
    }

    private getFormattedISODate(): string {
        const date = new Date();

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Add 1 because months are 0-indexed
        const day = String(date.getDate()).padStart(2, '0');

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        const isoDate = `${year}-${month}-${day} ${hours}:${minutes}`;

        return isoDate;
    }


    private async ensureAllFoldersExist(mySettings: CreateNoteSettings): Promise<boolean> {

        // Array of [folderPath, errorMessage]
        const checks: [string, string][] = [
            [this.#settings.attachementFolderPath, `Folder ${this.#settings.attachementFolderPath} does not exist`],
            [this.#settings.inputFolderPath, `Folder ${this.#settings.inputFolderPath} does not exist`],
            [this.#settings.noteFolderPath, `Folder ${this.#settings.noteFolderPath} does not exist`],
            [this.#settings.templateFolderPath, `Folder ${this.#settings.templateFolderPath} does not exist`]
        ];

        // If template should be used, add it to the checks array
        if (this.#settings.useTemplate) {
            checks.push([
                `${this.#settings.templateFolderPath}/${this.#settings.importTemplate}`,
                `Template ${this.#settings.importTemplate} does not exist`
            ]);
        }

        for (const [path, msg] of checks) {
            if (!await this.#app.vault.adapter.exists(path)) {
                new Notice(msg);
                return false;
            }
        }

        return true;
    }



    //
    // -----------------------------------
    //
    public async renameNoteWithCreatedDate(file: TFile) {
        try {
            // Read file content
            const content = await this.#app.vault.read(file);

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
            await this.#app.fileManager.renameFile(
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
            // return cleanDate.replace(/-/g, '').slice(0, 8);
            return cleanDate.slice(0, 10);
        }
        // Handle DD.MM.YYYY format (e.g., "20.08.2023")
        else if (cleanDate.match(/^\d{2}\.\d{2}\.\d{4}$/)) {

            const parts = cleanDate.split('.');
            // Rearrange from DD.MM.YYYY to YYYY-MM-DD
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        return "";
    }


}