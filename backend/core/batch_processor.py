import pandas as pd
from .document_engine import DocumentEngine
import os

class BatchProcessor:
    def __init__(self, document_engine: DocumentEngine):
        self.engine = document_engine

    def load_csv(self, csv_path):
        """Reads CSV file and returns list of dictionaries."""
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV file not found: {csv_path}")
        
        try:
            df = pd.read_csv(csv_path)
            return df.to_dict(orient='records')
        except Exception as e:
            raise ValueError(f"Error reading CSV: {e}")

    def validate_columns(self, csv_columns, template_placeholders):
        """Ensures CSV columns cover all required template placeholders."""
        missing = [ph for ph in template_placeholders if ph not in csv_columns]
        return missing

    def run_batch(self, template_path, data_list, output_dir, generate_pdf=False, progress_callback=None):
        """Processes a list of data rows to generate documents."""
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        generated_files = []
        total = len(data_list)
        
        for i, row in enumerate(data_list):
            try:
                # Sanitize filenames if possible, maybe use a specific column or index
                filename_base = f"document_{i+1}"
                if 'filename' in row:
                    filename_base = str(row['filename'])
                elif 'name' in row:
                    filename_base = str(row['name'])
                    
                ext = ".pptx" if template_path.lower().endswith('.pptx') else ".docx"
                filename = f"{filename_base}{ext}"
                output_path = os.path.join(output_dir, filename)
                
                generated_docx, generated_pdf, error_msg = self.engine.generate(template_path, row, output_path, convert_pdf=generate_pdf)
                status = 'Success'
                if error_msg:
                    status = f"Success (PDF Failed: {error_msg})"
                generated_files.append({'docx': generated_docx, 'pdf': generated_pdf, 'status': status})
                
            except Exception as e:
                generated_files.append({'docx': None, 'pdf': None, 'status': f'Error: {e}'})
                
            if progress_callback:
                progress_callback(i + 1, total)
                
        return generated_files
