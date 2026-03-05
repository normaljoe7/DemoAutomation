from .storage_manager import StorageManager
from .document_engine import DocumentEngine
import os
import shutil

class TemplateManager:
    def __init__(self, storage_manager: StorageManager):
        self.storage = storage_manager
        self.engine = DocumentEngine()
        self.templates_dir = "templates"

    def add_template(self, display_name, file_path):
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Template not found: {file_path}")
            
        # Copy to templates directory to ensure persistence
        filename = os.path.basename(file_path)
        dest_path = os.path.join(self.templates_dir, filename)
        
        try:
            if os.path.abspath(file_path) != os.path.abspath(dest_path):
                shutil.copy(file_path, dest_path)
        except shutil.SameFileError:
            pass
        except Exception as e:
            # If we fail to copy for some other reason (e.g. permission), raise it
            raise ImportError(f"Failed to copy template file: {e}")
        
        # Extract placeholders
        # FIRST: Fix XML if needed (remove split tags inside placeholders)
        try:
            self.engine.fix_template_xml(dest_path)
        except:
            pass
            
        placeholders = self.engine.scan_variables(dest_path)
        
        # Save to DB
        self.storage.add_template(display_name, dest_path, placeholders)
        return True

    def get_all_templates(self):
        return self.storage.get_templates()

    def sync_templates(self):
        """Rescans all templates to update variable order."""
        templates = self.get_all_templates()
        for t in templates:
            # t: (id, name, path, placeholders, created_at)
            tid, name, path, _, _ = t
            if os.path.exists(path):
                try:
                    self.engine.fix_template_xml(path)
                    new_placeholders = self.engine.scan_variables(path)
                    # Check if different? Or just update always to be safe about order
                    self.storage.update_template_placeholders(tid, new_placeholders)
                except Exception as e:
                    print(f"Failed to sync template {name}: {e}")

    def delete_template(self, template_id):
        template = self.storage.get_template(template_id)
        if template:
            # template is a tuple (id, name, path, placeholders, created_at)
            path = template[2]
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass # best effort
            self.storage.delete_template(template_id)
            return True
        return False
