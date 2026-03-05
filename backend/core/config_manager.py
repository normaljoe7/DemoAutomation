import json
import os

class ConfigManager:
    def __init__(self, config_path="data/field_options.json"):
        self.config_path = config_path
        self._ensure_config()
        self.field_options = self.load_config()

    def _ensure_config(self):
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        if not os.path.exists(self.config_path):
            with open(self.config_path, 'w') as f:
                json.dump({}, f)

    def load_config(self):
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except:
            return {}

    def save_config(self):
        with open(self.config_path, 'w') as f:
            json.dump(self.field_options, f, indent=4)

    def get_field_config(self, field_name):
        return self.field_options.get(field_name, None)

    def set_field_config(self, field_name, field_type, options=[]):
        """
        field_type: 'text', 'select', 'checkbox'
        options: list of strings
        """
        self.field_options[field_name] = {
            "type": field_type,
            "options": options
        }
        self.save_config()

    def delete_field_config(self, field_name):
        if field_name in self.field_options:
            del self.field_options[field_name]
            self.save_config()
