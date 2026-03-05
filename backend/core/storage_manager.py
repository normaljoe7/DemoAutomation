import sqlite3
import os
import json
from datetime import datetime

class StorageManager:
    def __init__(self, db_path="data/app.db"):
        self.db_path = db_path
        self._ensure_data_dir()
        self.conn = sqlite3.connect(self.db_path)
        self.cursor = self.conn.cursor()
        self.create_tables()

    def _ensure_data_dir(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

    def create_tables(self):
        # Templates table
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                placeholders TEXT,  -- JSON list of placeholder names
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # History table
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id INTEGER,
                generated_file_path TEXT,
                status TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (template_id) REFERENCES templates (id)
            )
        ''')
        
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact_info TEXT, -- JSON dictionary of variables
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        self.conn.commit()

    # Customer/Client Methods
    def add_customer(self, name, contact_info={}):
        self.cursor.execute('INSERT INTO customers (name, contact_info) VALUES (?, ?)',
                            (name, json.dumps(contact_info)))
        self.conn.commit()
        return self.cursor.lastrowid

    def update_customer(self, customer_id, name, contact_info):
        self.cursor.execute('UPDATE customers SET name = ?, contact_info = ? WHERE id = ?',
                            (name, json.dumps(contact_info), customer_id))
        self.conn.commit()

    def get_customers(self):
        self.cursor.execute('SELECT * FROM customers ORDER BY name')
        return self.cursor.fetchall()

    def get_customer(self, customer_id):
        self.cursor.execute('SELECT * FROM customers WHERE id = ?', (customer_id,))
        return self.cursor.fetchone()

    def delete_customer(self, customer_id):
        self.cursor.execute('DELETE FROM customers WHERE id = ?', (customer_id,))
        self.conn.commit()


    def add_template(self, name, file_path, placeholders):
        self.cursor.execute('INSERT INTO templates (name, file_path, placeholders) VALUES (?, ?, ?)',
                            (name, file_path, json.dumps(placeholders)))
        self.conn.commit()

    def update_template_placeholders(self, template_id, placeholders):
        self.cursor.execute('UPDATE templates SET placeholders = ? WHERE id = ?',
                            (json.dumps(placeholders), template_id))
        self.conn.commit()

    def get_templates(self):
        self.cursor.execute('SELECT * FROM templates')
        return self.cursor.fetchall()

    def get_template(self, template_id):
        self.cursor.execute('SELECT * FROM templates WHERE id = ?', (template_id,))
        return self.cursor.fetchone()
    
    def delete_template(self, template_id):
        self.cursor.execute('DELETE FROM templates WHERE id = ?', (template_id,))
        self.conn.commit()

    def add_history(self, template_id, generated_file_path, status):
        self.cursor.execute('INSERT INTO history (template_id, generated_file_path, status) VALUES (?, ?, ?)',
                            (template_id, generated_file_path, status))
        self.conn.commit()
    
    def get_history(self):
        self.cursor.execute('''
            SELECT h.id, t.name, h.generated_file_path, h.status, h.timestamp 
            FROM history h
            JOIN templates t ON h.template_id = t.id
            ORDER BY h.timestamp DESC
        ''')
        return self.cursor.fetchall()
        
    def close(self):
        self.conn.close()
