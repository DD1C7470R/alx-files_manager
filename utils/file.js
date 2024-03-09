const VALID_FILE_TYPES = ['folder', 'file', 'image'];
class FileCollection {

}

export class File {
  constructor(userId, name, type, parentId, isPublic, data) {
    this.userId = userId;
    this.name = name;
    this.type = type;
    this.parentId = parentId;
    this.isPublic = isPublic;
    this.data = data;
  }

  async validate() {
    if (!this.name) {
      return 'Missing name';
    }
    if (!this.data && this.type !== 'folder') {
      return 'Missing data';
    }
    if (!this.type || !VALID_FILE_TYPES.includes(this.type)) {
      return 'Missing type';
    }
    return null;
  }
}
export default FileCollection;
