from docxtpl import DocxTemplate, RichText

def is_number(s):
    if not s: return False
    # If s starts with 0 and has length > 1, it might be an invoice number (e.g. 001)
    # We should NOT treat it as a number for currency formatting.
    # Exception: 0.5, 0.00
    if len(s) > 1 and s.startswith('0') and '.' not in s:
         return False
         
    try:
        float(s.replace(',', '')) # handle 1,000.00
        return True
    except ValueError:
        return False

def format_indian_style(value):
    """
    Format a number in Indian Numbering System (e.g. 1,00,000.00)
    """
    try:
        val_str = f"{value:.2f}"
        whole, dec = val_str.split('.')
        
        # Format whole part: last 3 digits, then chunks of 2
        last_three = whole[-3:]
        remaining = whole[:-3]
        
        if remaining:
            # Reverse remaining, take chunks of 2
            chunks = []
            param = remaining[::-1]
            for i in range(0, len(param), 2):
                chunks.append(param[i:i+2][::-1])
            
            # Combine back (reversed list is in correct order now)
            formatted_chunks = ",".join(chunks[::-1])
            result = f"{formatted_chunks},{last_three}"
        else:
            result = last_three
            
        return f"{result}.{dec}"
        
    except:
        return f"{value:,.2f}"

def format_date_ordinal(date_str):
    """
    Formats a date string to include ordinal suffix (st, nd, rd, th) using RichText for superscript.
    Input: "12 December 2024" or "2024-12-12"
    Output: RichText object or string
    """
    import re
    
    # Check if this looks like a date: "DD Month YYYY" or "D Month YYYY"
    match = re.match(r"^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$", date_str)
    
    if match:
        day_str, month, year = match.groups()
        day = int(day_str)
        
        if 11 <= day <= 13:
            suffix = "th"
        else:
            suffix = {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
            
        # Use docxtpl.RichText for superscript
        rt = RichText()
        rt.add(f"{day}")
        rt.add(f"{suffix}", superscript=True)
        rt.add(f" {month} {year}")
        return rt
        
    return date_str

def smart_format_data(data, default_currency_symbol=""):
    """
    Scans data dictionary.
    Formats currencies using proper locale rules:
    - INR/₹: 1,00,000.00 (Indian)
    - USD/$/Others: 100,000.00 (Western)
    """
    
    # Map suffixes to symbols
    currency_map = {
        'inr': '₹',
        'usd': '$',
        'ussd': '$',
        'eur': '€',
        'gbp': '£',
        'jpy': '¥',
        'aud': '$',
        'cad': '$'
    }

    # Strong identifiers for MONEY
    currency_keywords = [
        'price', 'amount', 'cost', 'total', 'fee', 'net', 
        'gross', 'salary', 'sum', 'value',  
        'bill', 'payment', 'due', 'deposit', 'advance'
        # Removed 'invoice' to prevent "Invoice No: $100"
    ]
    
    # Identifiers for PERCENTAGE
    percentage_keywords = ['rate', 'percent', 'margin', 'discount', 'gst']
    
    # Ambiguous tax words
    tax_money_keywords = ['tax', 'vat']

    formatted_data = data.copy()
    
    for key, value in formatted_data.items():
        key_lower = key.lower()
        val_str = str(value).strip()
        
        if not val_str: continue
            
        if is_number(val_str):
            try:
                f_val = float(val_str.replace(',', ''))
                
                # Determine Symbol
                symbol = default_currency_symbol
                parts = key_lower.split('_')
                suffix = ""
                
                # Check explicit prefix/suffix for USD/INR override
                if 'us_' in key_lower or 'usd_' in key_lower or '_usd' in key_lower or '_us' in key_lower:
                    symbol = '$'
                    suffix = 'usd' # force validation logic to treat as usd
                elif 'inr_' in key_lower or '_inr' in key_lower or symbol == '₹':
                     symbol = '₹'
                     suffix = 'inr'
                elif len(parts) > 1:
                    suffix = parts[-1]
                    if suffix in currency_map:
                        symbol = currency_map[suffix]
                
                # Check Type
                is_currency = any(kw in key_lower for kw in currency_keywords)
                # FIX: "gst_amount" should NOT be percentage. Percentage is only if it has % keywords AND NO money keywords
                is_percentage = any(kw in key_lower for kw in percentage_keywords)
                if 'amount' in key_lower or 'value' in key_lower or 'price' in key_lower:
                     is_percentage = False
                     
                # HARD EXCLUSION for tax_amount and gst_amount to be absolutely safe
                if key_lower in ['tax_amount', 'gst_amount', 'us_rate_amount', 'in_rate_amount']:
                     is_percentage = False
                     
                # CHECK: if this is "tax_amount", FORCE it to be treated as currency, NOT percentage.
                # And if default_symbol is not set, but we suspect it is USD context?
                # Actually, perform_calculations does the heavy lifting for tax_rate -> tax_amount.
                # But if smart_format_data sees "150.00" in tax_amount, it might try to format it.
                # If we want to ensure it is '$', we need to know context. 
                # Use simple heuristic: if no symbol, and not INR, default to $ for tax_amount?
                pass

                is_tax_money = any(kw in key_lower for kw in tax_money_keywords)
                # FIX: tax_rate should NOT be money.
                if 'rate' in key_lower or 'percent' in key_lower:
                     is_tax_money = False

                if is_currency or is_tax_money:
                    # Choose format
                    # If symbol is ₹ or suffix is inr -> Indian
                    # Else -> Western
                    
                    final_str = ""
                    use_indian = symbol == '₹' or suffix == 'inr'
                    
                    if use_indian:
                        final_str = f"{symbol}{format_indian_style(f_val)}"
                    else:
                        final_str = f"{symbol}{f_val:,.2f}"
                        
                    formatted_data[key] = final_str
                    
                elif is_percentage:
                    if '%' not in val_str:
                        formatted_data[key] = f"{val_str}%"
                    
            except:
                pass 

        # Check percentage if loop continues (fix scope issue)
        # FIX: Ensure we don't treat "gst_amount" as percentage here either
        elif ('rate' in key_lower or 'percent' in key_lower or 'gst' in key_lower) and \
             ('amount' not in key_lower and 'value' not in key_lower and 'price' not in key_lower):
            if '%' not in val_str:
                formatted_data[key] = f"{val_str}%"
                        
        # Date Logic: Check if value looks like a date "DD Month YYYY"
        # We do this AFTER currency check to avoid formatting money as date (unlikely but safe)
        if not is_number(val_str) and " " in val_str:
             # Basic check
             formatted_data[key] = format_date_ordinal(val_str)

    return formatted_data

def perform_calculations(data):
    """
    Advanced Calculator for Document Automation.
    Handles:
    1. Quantity * Price_SUFFIX -> Amount_SUFFIX (e.g. price_inr -> amount_inr)
    2. GST Calculations (CGST/SGST) on INR amounts.
    3. Totals summation.
    """
    calculated_data = data.copy()
    
    # helper to clean float
    def get_float(val):
        if not val: return 0.0
        try:
            return float(str(val).replace(',', '').replace('%', '').strip())
        except:
            return 0.0

    # 1. Identify Quantity (Global)
    qty = 0.0
    for k, v in data.items():
        if k.lower() in ['quantity', 'qty', 'units', 'count']:
            qty = get_float(v)
            break
            
    if qty == 0:
        return calculated_data

    # 2. Iterate keys to find "price_SUFFIX" or "rate_SUFFIX"
    # We want to support price_inr, price_usd, price_eur, etc.
    # Or just "price" (no suffix)
    
    prices = {} # { 'inr': 2.0, 'usd': 0.0, '': 500.0 }
    
    for k, v in data.items():
        k_lower = k.lower()
        if 'price' in k_lower or ('rate' in k_lower and 'tax' not in k_lower and 'gst' not in k_lower):
            # Extract suffix
            parts = k_lower.split('_')
            suffix = ""
            if len(parts) > 1:
                # assume last part is suffix if it's a currency-like thing or just standard naming
                # explicit checks: inr, usd, eur, gbp, aud, cad
                last = parts[-1]
                if last in ['inr', 'usd', 'eur', 'gbp', 'aud', 'cad']:
                    suffix = last
            
            prices[suffix] = get_float(v)

    # 3. Calculate Amounts based on Prices
    amounts = {} # { 'inr': 100000.0 }
    
    for suffix, price in prices.items():
        # Even if price is 0, we calculate amount (0)
        if price >= 0:
            amt = qty * price
            amounts[suffix] = amt
            
            # Fill "amount_SUFFIX" or "total_value_SUFFIX"
            target_key_part = f"_{suffix}" if suffix else ""
            
            # Use Indian Format if suffix is inr
            val_str = format_indian_style(amt) if suffix == 'inr' else f"{amt:,.2f}"
            
            for k in calculated_data:
                k_lower = k.lower()
                if 'amount' in k_lower and 'total' not in k_lower and 'gst' not in k_lower:
                    if k_lower.endswith(target_key_part) or (not suffix and '_' not in k_lower):
                        if not calculated_data[k]:
                            calculated_data[k] = val_str

    # 4. GST Calculations (Specific to INR usually, but let's apply to base amount if found)
    # We look for cgst_rate, sgst_rate
    cgst_rate = 0.0
    sgst_rate = 0.0
    
    for k, v in data.items():
        # strict check for rate to avoid "cgst_amount"
        if 'cgst' in k.lower() and ('rate' in k.lower() or 'percent' in k.lower() or k.lower() == 'cgst_rate'):
            cgst_rate = get_float(v)
        if 'sgst' in k.lower() and ('rate' in k.lower() or 'percent' in k.lower() or k.lower() == 'sgst_rate'):
            sgst_rate = get_float(v)
            
    # Fix: If user entered "18" in a field like "tax_rate", we should catch that too if generic
    if cgst_rate == 0 and sgst_rate == 0:
         for k, v in data.items():
              if 'tax' in k.lower() and 'rate' in k.lower():
                   # Found a generic tax rate, e.g. 18.0
                   # Assume split 50/50 for CGST/SGST if it's a general tax rate for India context
                   rate = get_float(v)
                   if rate > 0:
                       cgst_rate = rate / 2.0
                       sgst_rate = rate / 2.0
                   break
            
    # Logic: Taxable Amount
    taxable_amt = amounts.get('inr', amounts.get('', 0.0))
    
    # DEBUG
    # print(f"DEBUG CALC: Taxable: {taxable_amt}, CGST Rate: {cgst_rate}, SGST Rate: {sgst_rate}")

    cgst_amt = 0.0
    sgst_amt = 0.0
    
    # Calculate Tax Amounts
    if taxable_amt > 0:
        if cgst_rate > 0:
            cgst_amt = taxable_amt * (cgst_rate / 100.0)
            
            # Find matching placeholder to Fill
            # Valid keys: cgst_amount, cgst_amt, tax_amount (if specific)
            found_cgst = False
            for k in calculated_data:
                if 'cgst' in k.lower() and ('amount' in k.lower() or 'amt' in k.lower() or 'value' in k.lower()):
                     # Fill it!
                     c_val = format_indian_style(cgst_amt)
                     calculated_data[k] = c_val
                     found_cgst = True
            
            # If no specific CGST key found, but we have a generic "tax_amount", add to it?
            # Or assume the user wants single tax sum.
            if not found_cgst:
                 # Check for generic "tax_amount" 
                 pass # Logic below handles generic total tax if needed
            
        if sgst_rate > 0:
            sgst_amt = taxable_amt * (sgst_rate / 100.0)
            for k in calculated_data:
                if 'sgst' in k.lower() and ('amount' in k.lower() or 'amt' in k.lower() or 'value' in k.lower()):
                     s_val = format_indian_style(sgst_amt)
                     calculated_data[k] = s_val

    # 4b. Dynamic Tax/Rate Calculations (Generic Tax Rate -> Tax Amount)
    # MOVED UP before Totals so it is included in Total Amount
    
    amount_usd = amounts.get('usd', 0.0)
    amount_inr = amounts.get('inr', 0.0)
    
    # Generic Tax Amount accumulator for Total calculation
    calculated_generic_tax = 0.0

    for key, val in data.items():
        # Specific User Request: "tax_rate" -> "tax_amount", "gst_rate" -> "gst_amount"
        # Logic: Use USD Amount first, then INR Amount
        k_lower = key.lower()
        if k_lower in ['tax_rate', 'gst_rate']:
            rate_val = get_float(val)
            # Even if rate is 0, we must handle it to prevent "Enter tax_amount" prompt
            # But we only calculate if > 0. If 0, we fill 0 later.
            
            tgt_key = k_lower.replace('rate', 'amount') # tax_amount or gst_amount
            
            # Force Overwrite: logic implies if these rates exist, the amounts are strictly calculated.
            target_val = 0.0
            currency_sym = ""
            use_indian = False
            
            if amount_usd > 0:
                 target_val = amount_usd * (rate_val / 100.0)
                 currency_sym = "$"
            elif amount_inr > 0:
                 target_val = amount_inr * (rate_val / 100.0)
                 currency_sym = "₹"
                 use_indian = True
            
            if target_val > 0:
                 calculated_generic_tax += target_val
                 if use_indian:
                      calculated_data[tgt_key] = f"{currency_sym}{format_indian_style(target_val)}"
                 else:
                      calculated_data[tgt_key] = f"{currency_sym}{target_val:,.2f}"
            else:
                 # If rate is 0 or amount is 0, ensure target is "0.00" so it doesn't prompt
                 if tgt_key not in calculated_data or not calculated_data[tgt_key]:
                      calculated_data[tgt_key] = "0.00"


    # 5. Grand Totals
    # Total INR = taxable_inr + cgst + sgst + any generic tax calculated above if in INR context
    if 'inr' in amounts:
        # Note: calculated_generic_tax might be in USD if USD amount existed. 
        # So we should strictly add it only if it matches context? 
        # For simplicity, existing logic used cgst_amt/sgst_amt.
        
        # Calculate Total INR
        # Base Amount (INR) + CGST + SGST
        # If we have a generic tax calculated in INR mode (check use_indian flag from loop above? tricky to track)
        # Instead, let's rely on what we just wrote to calculated_data['tax_amount'] if it was INR?
        # Better: use the numeric values we computed.
        
        # If the generic tax was calculated in INR context (because amount_inr > 0 and amount_usd == 0)
        # then we add it. 
        # Heuristic: If amount_usd is > 0, the generic tax is USD. If amount_usd is 0, it is INR.
        
        extra_tax_inr = 0.0
        if amount_usd == 0 and amount_inr > 0:
             extra_tax_inr = calculated_generic_tax
        
        total_inr = amounts['inr'] + cgst_amt + sgst_amt + extra_tax_inr
        
        # formatting...
        for k in calculated_data:
            if 'total' in k.lower() and 'inr' in k.lower():
                if not calculated_data[k]: calculated_data[k] = format_indian_style(total_inr)

    # Total USD = amount_usd 
    if 'usd' in amounts:
        # If we calculated generic tax in USD, should we add it? 
        # User complained Total Amount doesn't take GST into consideration.
        # Assuming Total USD should include tax if tax was calculated on it.
        total_usd = amounts['usd']
        
        # If we had a generic tax_rate applied to USD...
        if amount_usd > 0 and calculated_generic_tax > 0:
             # Heuristic: calculated_generic_tax is likely USD since amount_usd > 0 is Priority #1
             total_usd += calculated_generic_tax

        for k in calculated_data:
            if 'total' in k.lower() and 'usd' in k.lower():
                # Force strictly format with $
                calculated_data[k] = f"${total_usd:,.2f}"
        
        
    # Generic "Total" (no suffix)
    if '' in amounts:
        # If we have a generic price/amount, assume taxes apply to it too
        total_generic = amounts[''] + cgst_amt + sgst_amt + calculated_generic_tax
        for k in calculated_data:
             k_lower = k.lower()
             if 'total' in k_lower and 'inr' not in k_lower and 'usd' not in k_lower:
                if not calculated_data[k]: calculated_data[k] = f"{total_generic:,.2f}"
              
             if ('tax' in k_lower or 'vat' in k_lower) and 'amount' in k_lower and 'rate' not in k_lower:
                  if not calculated_data[k]:
                       # Sum of all taxes
                       total_tax = cgst_amt + sgst_amt + calculated_generic_tax
                       if total_tax > 0:
                            calculated_data[k] = f"{total_tax:,.2f}"
                       else:
                            calculated_data[k] = "0.00"
                            
    # 7. Final Cleanup: Ensure calculated Tax fields do NOT have '%'
    # This acts as a final sanitizer in case initial formatting was aggressive
    cleanup_keys = ['tax_amount', 'gst_amount', 'cgst_amount', 'sgst_amount']
    for k in calculated_data:
         if any(ck in k.lower() for ck in cleanup_keys):
              val = str(calculated_data[k])
              if '%' in val:
                   # Strip %, trim
                   clean_val = val.replace('%', '').strip()
                   # If it looks like a number, keep it clean. 
                   # If it was "18%", it becomes "18". 
                   # But wait, this is likely WRONG if it was supposed to be money.
                   # However, if we reached here, it means we calculated it properly earlier in steps 4/5.
                   # So if it has %, it might be from the User Input that wasn't overwritten?
                   # NO, we force overwrite.
                   # The only case it has % is if `smart_format_data` added it.
                   calculated_data[k] = clean_val
                   
         # FINAL ENFORCEMENT for tax_amount:
         # If it's just a number like "180.00", make it "$180.00"
         # We assume USD default if no symbol present, as per user request.
         if k.lower() == 'tax_amount':
              # Check if it has ANY currency symbol
              has_symbol = any(s in calculated_data[k] for s in ['$', '₹', '€', '£'])
              if not has_symbol:
                   # It's raw number, prepend $
                   calculated_data[k] = f"${calculated_data[k]}"

    return calculated_data

