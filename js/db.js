
const DB_NAME = 'HaldaiOS_DB';
const DB_VERSION = 1;

class HaldaiDB {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("IndexedDB Error:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("✅ IndexedDB Connected");
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Tasks Store
                if (!db.objectStoreNames.contains('tasks')) {
                    const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    tasksStore.createIndex('column_id', 'column_id', { unique: false });
                    tasksStore.createIndex('status', 'status', { unique: false });
                    tasksStore.createIndex('user_email', 'user_email', { unique: false });
                }
                // Notebooks Store
                if (!db.objectStoreNames.contains('notebooks')) {
                    const notesStore = db.createObjectStore('notebooks', { keyPath: 'id' });
                    notesStore.createIndex('created_at', 'created_at', { unique: false });
                    notesStore.createIndex('user_email', 'user_email', { unique: false });
                }
            };
        });
    }

    // --- GENERIC HELPERS ---
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async add(storeName, item) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item); // PUT upserts (insert or update)
            request.onsuccess = () => resolve(item);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // --- SPECIFIC ACCESSORS ---
    async getTasks(userEmail = null) {
        if (!this.db) return null;
        if (!userEmail) {
            // For backward compatibility, return all tasks if no email provided
            return this.getAll('tasks');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const index = store.index('user_email');
            const request = index.getAll(IDBKeyRange.only(userEmail));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveTask(task) {
        // Ensure task has user_email property
        if (window.state && window.state.user && window.state.user.email) {
            task.user_email = window.state.user.email;
        }
        return this.add('tasks', task);
    }

    async deleteTask(id) { return this.delete('tasks', id); }

    async getNotebooks(userEmail = null) {
        if (!this.db) return null;
        if (!userEmail) {
            // For backward compatibility, return all notebooks if no email provided
            return this.getAll('notebooks');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notebooks'], 'readonly');
            const store = transaction.objectStore('notebooks');
            const index = store.index('user_email');
            const request = index.getAll(IDBKeyRange.only(userEmail));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveNotebook(note) {
        // Ensure notebook has user_email property
        if (window.state && window.state.user && window.state.user.email) {
            note.user_email = window.state.user.email;
        }
        return this.add('notebooks', note);
    }

    async deleteNotebook(id) { return this.delete('notebooks', id); }
}

window.DB = new HaldaiDB();
