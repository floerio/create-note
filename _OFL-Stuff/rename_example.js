import { __awaiter } from "tslib";
import { Notice, TFolder } from 'obsidian';
/**
 * Example function demonstrating how to use app.vault.rename()
 *
 * The app.vault.rename() function is used to rename files or folders in the Obsidian vault.
 * Syntax: app.vault.rename(file: TAbstractFile, newPath: string): Promise<void>
 *
 * Parameters:
 * - file: The file or folder to rename (TFile or TFolder)
 * - newPath: The new path for the file or folder (including the new name)
 *
 * Returns: A Promise that resolves when the rename operation is complete
 */
export function renameExamples(app) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Example 1: Rename a file
            // First, get a reference to the file you want to rename
            const fileToRename = app.vault.getFileByPath('path/to/original-file.md');
            if (fileToRename) {
                // Rename the file to a new name in the same folder
                yield app.vault.rename(fileToRename, 'path/to/new-filename.md');
                new Notice('File renamed successfully!');
            }
            // Example 2: Move a file to a different folder (which is also a rename operation)
            const fileToMove = app.vault.getFileByPath('source/folder/document.md');
            if (fileToMove) {
                // Move the file to a different folder with the same name
                yield app.vault.rename(fileToMove, 'destination/folder/document.md');
                new Notice('File moved successfully!');
            }
            // Example 3: Rename a folder
            const folderToRename = app.vault.getAbstractFileByPath('old-folder-name');
            if (folderToRename && folderToRename instanceof TFolder) {
                // Rename the folder
                yield app.vault.rename(folderToRename, 'new-folder-name');
                new Notice('Folder renamed successfully!');
            }
            // Example 4: Rename a file and handle errors properly
            try {
                const file = app.vault.getFileByPath('notes/draft.md');
                if (!file) {
                    throw new Error('File not found');
                }
                // Check if destination already exists
                const newPath = 'notes/published.md';
                const exists = yield app.vault.adapter.exists(newPath);
                if (exists) {
                    throw new Error('Destination file already exists');
                }
                yield app.vault.rename(file, newPath);
                new Notice('File renamed from draft to published!');
            }
            catch (error) {
                new Notice(`Error renaming file: ${error.message}`);
                console.error('Error during rename operation:', error);
            }
            // Example 5: Practical use case - Rename with timestamp
            const noteFile = app.vault.getFileByPath('Untitled.md');
            if (noteFile) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const newName = `Notes-${timestamp}.md`;
                yield app.vault.rename(noteFile, newName);
                new Notice(`Added timestamp to file: ${newName}`);
            }
        }
        catch (error) {
            console.error('Error in rename examples:', error);
            new Notice(`Error: ${error.message}`);
        }
    });
}
/**
 * Example plugin command that renames the active file
 */
export function addRenameCommand(plugin) {
    plugin.addCommand({
        id: 'rename-current-file',
        name: 'Rename current file with prefix',
        editorCallback: (editor, view) => __awaiter(this, void 0, void 0, function* () {
            if (!view.file) {
                new Notice('No file is currently open');
                return;
            }
            // Get the current file
            const currentFile = view.file;
            // Get the current path and extract components
            const currentPath = currentFile.path;
            const lastSlashIndex = currentPath.lastIndexOf('/');
            const directory = lastSlashIndex !== -1 ? currentPath.substring(0, lastSlashIndex + 1) : '';
            const fileName = lastSlashIndex !== -1 ? currentPath.substring(lastSlashIndex + 1) : currentPath;
            // Create new path with prefix
            const newPath = directory + 'important-' + fileName;
            try {
                // Perform the rename operation
                yield plugin.app.vault.rename(currentFile, newPath);
                new Notice(`File renamed to: ${newPath}`);
            }
            catch (error) {
                new Notice(`Failed to rename file: ${error.message}`);
                console.error('Rename error:', error);
            }
        })
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuYW1lX2V4YW1wbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZW5hbWVfZXhhbXBsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFPLE1BQU0sRUFBaUIsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRS9EOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsTUFBTSxVQUFnQixjQUFjLENBQUMsR0FBUTs7UUFDekMsSUFBSTtZQUNBLDJCQUEyQjtZQUMzQix3REFBd0Q7WUFDeEQsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUV6RSxJQUFJLFlBQVksRUFBRTtnQkFDZCxtREFBbUQ7Z0JBQ25ELE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLHlCQUF5QixDQUFDLENBQUM7Z0JBQ2hFLElBQUksTUFBTSxDQUFDLDRCQUE0QixDQUFDLENBQUM7YUFDNUM7WUFFRCxrRkFBa0Y7WUFDbEYsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUV4RSxJQUFJLFVBQVUsRUFBRTtnQkFDWix5REFBeUQ7Z0JBQ3pELE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLGdDQUFnQyxDQUFDLENBQUM7Z0JBQ3JFLElBQUksTUFBTSxDQUFDLDBCQUEwQixDQUFDLENBQUM7YUFDMUM7WUFFRCw2QkFBNkI7WUFDN0IsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBWSxDQUFDO1lBRXJGLElBQUksY0FBYyxJQUFJLGNBQWMsWUFBWSxPQUFPLEVBQUU7Z0JBQ3JELG9CQUFvQjtnQkFDcEIsTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxNQUFNLENBQUMsOEJBQThCLENBQUMsQ0FBQzthQUM5QztZQUVELHNEQUFzRDtZQUN0RCxJQUFJO2dCQUNBLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQ3ZELElBQUksQ0FBQyxJQUFJLEVBQUU7b0JBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2lCQUNyQztnQkFFRCxzQ0FBc0M7Z0JBQ3RDLE1BQU0sT0FBTyxHQUFHLG9CQUFvQixDQUFDO2dCQUNyQyxNQUFNLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFFdkQsSUFBSSxNQUFNLEVBQUU7b0JBQ1IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO2lCQUN0RDtnQkFFRCxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxNQUFNLENBQUMsdUNBQXVDLENBQUMsQ0FBQzthQUN2RDtZQUFDLE9BQU8sS0FBSyxFQUFFO2dCQUNaLElBQUksTUFBTSxDQUFDLHdCQUF3QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDcEQsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUMxRDtZQUVELHdEQUF3RDtZQUN4RCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQVUsQ0FBQztZQUNqRSxJQUFJLFFBQVEsRUFBRTtnQkFDVixNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sT0FBTyxHQUFHLFNBQVMsU0FBUyxLQUFLLENBQUM7Z0JBQ3hDLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUMxQyxJQUFJLE1BQU0sQ0FBQyw0QkFBNEIsT0FBTyxFQUFFLENBQUMsQ0FBQzthQUNyRDtTQUVKO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDWixPQUFPLENBQUMsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2xELElBQUksTUFBTSxDQUFDLFVBQVUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7U0FDekM7SUFDTCxDQUFDO0NBQUE7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxNQUFjO0lBQzNDLE1BQU0sQ0FBQyxVQUFVLENBQUM7UUFDZCxFQUFFLEVBQUUscUJBQXFCO1FBQ3pCLElBQUksRUFBRSxpQ0FBaUM7UUFDdkMsY0FBYyxFQUFFLENBQU8sTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO2dCQUNaLElBQUksTUFBTSxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBQ3hDLE9BQU87YUFDVjtZQUVELHVCQUF1QjtZQUN2QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBRTlCLDhDQUE4QztZQUM5QyxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO1lBQ3JDLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEQsTUFBTSxTQUFTLEdBQUcsY0FBYyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM1RixNQUFNLFFBQVEsR0FBRyxjQUFjLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7WUFFakcsOEJBQThCO1lBQzlCLE1BQU0sT0FBTyxHQUFHLFNBQVMsR0FBRyxZQUFZLEdBQUcsUUFBUSxDQUFDO1lBRXBELElBQUk7Z0JBQ0EsK0JBQStCO2dCQUMvQixNQUFNLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ3BELElBQUksTUFBTSxDQUFDLG9CQUFvQixPQUFPLEVBQUUsQ0FBQyxDQUFDO2FBQzdDO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ1osSUFBSSxNQUFNLENBQUMsMEJBQTBCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUN0RCxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUN6QztRQUNMLENBQUMsQ0FBQTtLQUNKLENBQUMsQ0FBQztBQUNQLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIE5vdGljZSwgUGx1Z2luLCBURmlsZSwgVEZvbGRlciB9IGZyb20gJ29ic2lkaWFuJztcblxuLyoqXG4gKiBFeGFtcGxlIGZ1bmN0aW9uIGRlbW9uc3RyYXRpbmcgaG93IHRvIHVzZSBhcHAudmF1bHQucmVuYW1lKClcbiAqIFxuICogVGhlIGFwcC52YXVsdC5yZW5hbWUoKSBmdW5jdGlvbiBpcyB1c2VkIHRvIHJlbmFtZSBmaWxlcyBvciBmb2xkZXJzIGluIHRoZSBPYnNpZGlhbiB2YXVsdC5cbiAqIFN5bnRheDogYXBwLnZhdWx0LnJlbmFtZShmaWxlOiBUQWJzdHJhY3RGaWxlLCBuZXdQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+XG4gKiBcbiAqIFBhcmFtZXRlcnM6XG4gKiAtIGZpbGU6IFRoZSBmaWxlIG9yIGZvbGRlciB0byByZW5hbWUgKFRGaWxlIG9yIFRGb2xkZXIpXG4gKiAtIG5ld1BhdGg6IFRoZSBuZXcgcGF0aCBmb3IgdGhlIGZpbGUgb3IgZm9sZGVyIChpbmNsdWRpbmcgdGhlIG5ldyBuYW1lKVxuICogXG4gKiBSZXR1cm5zOiBBIFByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSByZW5hbWUgb3BlcmF0aW9uIGlzIGNvbXBsZXRlXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5hbWVFeGFtcGxlcyhhcHA6IEFwcCkge1xuICAgIHRyeSB7XG4gICAgICAgIC8vIEV4YW1wbGUgMTogUmVuYW1lIGEgZmlsZVxuICAgICAgICAvLyBGaXJzdCwgZ2V0IGEgcmVmZXJlbmNlIHRvIHRoZSBmaWxlIHlvdSB3YW50IHRvIHJlbmFtZVxuICAgICAgICBjb25zdCBmaWxlVG9SZW5hbWUgPSBhcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCgncGF0aC90by9vcmlnaW5hbC1maWxlLm1kJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoZmlsZVRvUmVuYW1lKSB7XG4gICAgICAgICAgICAvLyBSZW5hbWUgdGhlIGZpbGUgdG8gYSBuZXcgbmFtZSBpbiB0aGUgc2FtZSBmb2xkZXJcbiAgICAgICAgICAgIGF3YWl0IGFwcC52YXVsdC5yZW5hbWUoZmlsZVRvUmVuYW1lLCAncGF0aC90by9uZXctZmlsZW5hbWUubWQnKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0ZpbGUgcmVuYW1lZCBzdWNjZXNzZnVsbHkhJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEV4YW1wbGUgMjogTW92ZSBhIGZpbGUgdG8gYSBkaWZmZXJlbnQgZm9sZGVyICh3aGljaCBpcyBhbHNvIGEgcmVuYW1lIG9wZXJhdGlvbilcbiAgICAgICAgY29uc3QgZmlsZVRvTW92ZSA9IGFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKCdzb3VyY2UvZm9sZGVyL2RvY3VtZW50Lm1kJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoZmlsZVRvTW92ZSkge1xuICAgICAgICAgICAgLy8gTW92ZSB0aGUgZmlsZSB0byBhIGRpZmZlcmVudCBmb2xkZXIgd2l0aCB0aGUgc2FtZSBuYW1lXG4gICAgICAgICAgICBhd2FpdCBhcHAudmF1bHQucmVuYW1lKGZpbGVUb01vdmUsICdkZXN0aW5hdGlvbi9mb2xkZXIvZG9jdW1lbnQubWQnKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0ZpbGUgbW92ZWQgc3VjY2Vzc2Z1bGx5IScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFeGFtcGxlIDM6IFJlbmFtZSBhIGZvbGRlclxuICAgICAgICBjb25zdCBmb2xkZXJUb1JlbmFtZSA9IGFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoJ29sZC1mb2xkZXItbmFtZScpIGFzIFRGb2xkZXI7XG4gICAgICAgIFxuICAgICAgICBpZiAoZm9sZGVyVG9SZW5hbWUgJiYgZm9sZGVyVG9SZW5hbWUgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICAvLyBSZW5hbWUgdGhlIGZvbGRlclxuICAgICAgICAgICAgYXdhaXQgYXBwLnZhdWx0LnJlbmFtZShmb2xkZXJUb1JlbmFtZSwgJ25ldy1mb2xkZXItbmFtZScpO1xuICAgICAgICAgICAgbmV3IE5vdGljZSgnRm9sZGVyIHJlbmFtZWQgc3VjY2Vzc2Z1bGx5IScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFeGFtcGxlIDQ6IFJlbmFtZSBhIGZpbGUgYW5kIGhhbmRsZSBlcnJvcnMgcHJvcGVybHlcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBhcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCgnbm90ZXMvZHJhZnQubWQnKTtcbiAgICAgICAgICAgIGlmICghZmlsZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRmlsZSBub3QgZm91bmQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgZGVzdGluYXRpb24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgICAgIGNvbnN0IG5ld1BhdGggPSAnbm90ZXMvcHVibGlzaGVkLm1kJztcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0cyA9IGF3YWl0IGFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhuZXdQYXRoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGV4aXN0cykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRGVzdGluYXRpb24gZmlsZSBhbHJlYWR5IGV4aXN0cycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBhd2FpdCBhcHAudmF1bHQucmVuYW1lKGZpbGUsIG5ld1BhdGgpO1xuICAgICAgICAgICAgbmV3IE5vdGljZSgnRmlsZSByZW5hbWVkIGZyb20gZHJhZnQgdG8gcHVibGlzaGVkIScpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbmV3IE5vdGljZShgRXJyb3IgcmVuYW1pbmcgZmlsZTogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZHVyaW5nIHJlbmFtZSBvcGVyYXRpb246JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFeGFtcGxlIDU6IFByYWN0aWNhbCB1c2UgY2FzZSAtIFJlbmFtZSB3aXRoIHRpbWVzdGFtcFxuICAgICAgICBjb25zdCBub3RlRmlsZSA9IGFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKCdVbnRpdGxlZC5tZCcpIGFzIFRGaWxlO1xuICAgICAgICBpZiAobm90ZUZpbGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5yZXBsYWNlKC9bOi5dL2csICctJyk7XG4gICAgICAgICAgICBjb25zdCBuZXdOYW1lID0gYE5vdGVzLSR7dGltZXN0YW1wfS5tZGA7XG4gICAgICAgICAgICBhd2FpdCBhcHAudmF1bHQucmVuYW1lKG5vdGVGaWxlLCBuZXdOYW1lKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYEFkZGVkIHRpbWVzdGFtcCB0byBmaWxlOiAke25ld05hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gcmVuYW1lIGV4YW1wbGVzOicsIGVycm9yKTtcbiAgICAgICAgbmV3IE5vdGljZShgRXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICB9XG59XG5cbi8qKlxuICogRXhhbXBsZSBwbHVnaW4gY29tbWFuZCB0aGF0IHJlbmFtZXMgdGhlIGFjdGl2ZSBmaWxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRSZW5hbWVDb21tYW5kKHBsdWdpbjogUGx1Z2luKSB7XG4gICAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgICAgICBpZDogJ3JlbmFtZS1jdXJyZW50LWZpbGUnLFxuICAgICAgICBuYW1lOiAnUmVuYW1lIGN1cnJlbnQgZmlsZSB3aXRoIHByZWZpeCcsXG4gICAgICAgIGVkaXRvckNhbGxiYWNrOiBhc3luYyAoZWRpdG9yLCB2aWV3KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXZpZXcuZmlsZSkge1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ05vIGZpbGUgaXMgY3VycmVudGx5IG9wZW4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCB0aGUgY3VycmVudCBmaWxlXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RmlsZSA9IHZpZXcuZmlsZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IHRoZSBjdXJyZW50IHBhdGggYW5kIGV4dHJhY3QgY29tcG9uZW50c1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFBhdGggPSBjdXJyZW50RmlsZS5wYXRoO1xuICAgICAgICAgICAgY29uc3QgbGFzdFNsYXNoSW5kZXggPSBjdXJyZW50UGF0aC5sYXN0SW5kZXhPZignLycpO1xuICAgICAgICAgICAgY29uc3QgZGlyZWN0b3J5ID0gbGFzdFNsYXNoSW5kZXggIT09IC0xID8gY3VycmVudFBhdGguc3Vic3RyaW5nKDAsIGxhc3RTbGFzaEluZGV4ICsgMSkgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gbGFzdFNsYXNoSW5kZXggIT09IC0xID8gY3VycmVudFBhdGguc3Vic3RyaW5nKGxhc3RTbGFzaEluZGV4ICsgMSkgOiBjdXJyZW50UGF0aDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBwYXRoIHdpdGggcHJlZml4XG4gICAgICAgICAgICBjb25zdCBuZXdQYXRoID0gZGlyZWN0b3J5ICsgJ2ltcG9ydGFudC0nICsgZmlsZU5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gUGVyZm9ybSB0aGUgcmVuYW1lIG9wZXJhdGlvblxuICAgICAgICAgICAgICAgIGF3YWl0IHBsdWdpbi5hcHAudmF1bHQucmVuYW1lKGN1cnJlbnRGaWxlLCBuZXdQYXRoKTtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBGaWxlIHJlbmFtZWQgdG86ICR7bmV3UGF0aH1gKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShgRmFpbGVkIHRvIHJlbmFtZSBmaWxlOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignUmVuYW1lIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufSJdfQ==