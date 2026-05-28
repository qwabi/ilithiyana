import urllib.request
import json
from bs4 import BeautifulSoup
import re
import concurrent.futures
from urllib.parse import urljoin, urlparse
import socket

# Set default timeouts for socket operations to prevent hanging on slow websites
socket.setdefaulttimeout(6)

PROVINCES_LIST = [
    "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", 
    "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"
]

CITY_TO_PROVINCE = {
    # Gauteng
    "johannesburg": "Gauteng", "pretoria": "Gauteng", "midrand": "Gauteng", "centurion": "Gauteng",
    "soweto": "Gauteng", "vanderbijlpark": "Gauteng", "benoni": "Gauteng", "boksburg": "Gauteng",
    "germiston": "Gauteng", "braamfontein": "Gauteng", "auckland park": "Gauteng", "kempton park": "Gauteng",
    "randburg": "Gauteng", "roodepoort": "Gauteng", "sandton": "Gauteng", "vaalgri": "Gauteng",
    
    # Western Cape
    "cape town": "Western Cape", "stellenbosch": "Western Cape", "bellville": "Western Cape",
    "salt river": "Western Cape", "george": "Western Cape", "worcester": "Western Cape",
    "oudtshoorn": "Western Cape", "paarl": "Western Cape", "rondebosch": "Western Cape",
    "belhar": "Western Cape", "observatory": "Western Cape", "tygerberg": "Western Cape",
    
    # KwaZulu-Natal
    "durban": "KwaZulu-Natal", "pietermaritzburg": "KwaZulu-Natal", "kwamakhutha": "KwaZulu-Natal",
    "amanzimtoti": "KwaZulu-Natal", "umlazi": "KwaZulu-Natal", "pinetown": "KwaZulu-Natal",
    "empangeni": "KwaZulu-Natal", "richards bay": "KwaZulu-Natal", "westville": "KwaZulu-Natal",
    "berwyn court": "KwaZulu-Natal",
    
    # Free State
    "bloemfontein": "Free State", "welkom": "Free State", "sasolburg": "Free State",
    "phuthaditjhaba": "Free State", "kroonstad": "Free State",
    
    # Eastern Cape
    "port elizabeth": "Eastern Cape", "gqeberha": "Eastern Cape", "east london": "Eastern Cape",
    "grahamstown": "Eastern Cape", "makhanda": "Eastern Cape", "alice": "Eastern Cape",
    "mthatha": "Eastern Cape", "southernwood": "Eastern Cape", "uitenhage": "Eastern Cape",
    "lovedale": "Eastern Cape", "butterworth": "Eastern Cape", "queenstown": "Eastern Cape",
    "komani": "Eastern Cape",
    
    # Limpopo
    "polokwane": "Limpopo", "ga-rankuwa": "Limpopo", "medunsa": "Limpopo", "thohoyandou": "Limpopo",
    "tzaneen": "Limpopo", "giyani": "Limpopo", "sovenga": "Limpopo",
    
    # Northern Cape
    "kimberley": "Northern Cape", "upington": "Northern Cape",
    
    # Mpumalanga
    "nelspruit": "Mpumalanga", "mbombela": "Mpumalanga", "witbank": "Mpumalanga",
    "emalahleni": "Mpumalanga", "secunda": "Mpumalanga", "mamelodi": "Mpumalanga",
    
    # North West
    "potchefstroom": "North West", "mafikeng": "North West", "mahikeng": "North West",
    "rustenburg": "North West", "klerksdorp": "North West", "mmabatho": "North West"
}

def clean_url(url):
    if not url:
        return ""
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        return "https://" + url
    return url

def extract_province_from_text(text):
    if not text:
        return ""
    for prov in PROVINCES_LIST:
        if prov.lower() in text.lower():
            return prov
    lower_text = text.lower()
    if "kzn" in lower_text:
        return "KwaZulu-Natal"
    if "gauteng" in lower_text:
        return "Gauteng"
    if "eastern cape" in lower_text or "ec" in lower_text.split():
        return "Eastern Cape"
    if "western cape" in lower_text or "wc" in lower_text.split():
        return "Western Cape"
    return ""

def extract_city_from_address(address):
    if not address:
        return ""
    parts = [p.strip() for p in address.split(",") if p.strip()]
    if not parts:
        return ""
    for part in reversed(parts):
        cleaned = re.sub(r"\d{4}", "", part).strip()
        if cleaned and cleaned not in PROVINCES_LIST and len(cleaned) > 2:
            if cleaned.lower() not in ["south africa", "po box", "private bag", "p/bag"]:
                return cleaned
    return parts[-1] if parts else ""

def get_html(url):
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.read().decode('utf-8', errors='ignore')
    except Exception:
        return ""

def crawl_site(website_url):
    data = {
        "faculties": [],
        "socials": {
            "facebook": "",
            "instagram": "",
            "linkedin": "",
            "x": "",
            "youtube": ""
        },
        "nsfas_supported": None,
        "student_accommodation": None,
        "application_url": "",
        "prospectus_url": "",
        "extra_emails": [],
        "extra_phones": []
    }
    
    homepage_html = get_html(website_url)
    if not homepage_html:
        return data
        
    soup = BeautifulSoup(homepage_html, 'html.parser')
    
    # 1. NSFAS check
    text_content = soup.get_text().lower()
    if "nsfas" in text_content:
        data["nsfas_supported"] = True
        
    # 2. Accommodation check
    if any(keyword in text_content for keyword in ["accommodation", "residence", "residences", "student housing"]):
        data["student_accommodation"] = True
        
    # 3. Search for links
    links = soup.find_all('a', href=True)
    subpages_to_check = {}
    
    for link in links:
        href = link['href'].strip()
        link_text = link.text.strip().lower()
        full_href = urljoin(website_url, href)
        
        # Socials
        if "facebook.com" in href:
            data["socials"]["facebook"] = full_href
        elif "instagram.com" in href:
            data["socials"]["instagram"] = full_href
        elif "linkedin.com" in href:
            data["socials"]["linkedin"] = full_href
        elif "twitter.com" in href or "x.com" in href:
            data["socials"]["x"] = full_href
        elif "youtube.com" in href:
            data["socials"]["youtube"] = full_href
            
        # Identify subpages
        if "contact" in link_text or "contact" in href.lower():
            subpages_to_check["contact"] = full_href
        elif "about" in link_text or "about" in href.lower():
            subpages_to_check["about"] = full_href
        elif any(k in link_text or k in href.lower() for k in ["courses", "what to study", "programmes", "academic"]):
            subpages_to_check["courses"] = full_href
        elif any(k in link_text or k in href.lower() for k in ["apply", "admission", "register"]):
            subpages_to_check["admissions"] = full_href
            if not data["application_url"]:
                data["application_url"] = full_href
        elif "prospectus" in link_text or "prospectus" in href.lower():
            data["prospectus_url"] = full_href
            subpages_to_check["prospectus"] = full_href

    # Crawl contact/courses subpages (only if we got HTML)
    for category, url in subpages_to_check.items():
        sub_html = get_html(url)
        if not sub_html:
            continue
        sub_soup = BeautifulSoup(sub_html, 'html.parser')
        sub_text = sub_soup.get_text()
        
        # Extract emails
        emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', sub_text)
        data["extra_emails"].extend([e for e in emails if not e.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp'))])
        
        # Extract phone numbers
        phones = re.findall(r'\+?27\s?\(?0\)?\d{2}\s?\d{3}\s?\d{4}|\b0\d{2}\s?\d{3}\s?\d{4}\b', sub_text)
        data["extra_phones"].extend(phones)
        
        # NSFAS / Accommodation fallback checks
        if "nsfas" in sub_text.lower():
            data["nsfas_supported"] = True
        if any(keyword in sub_text.lower() for keyword in ["accommodation", "residence", "residences", "student housing"]):
            data["student_accommodation"] = True
            
        # Extract faculties heuristic
        if category == "courses":
            fac_matches = re.findall(r'(?:Faculty of|School of|Department of)\s+([A-Z][a-zA-Z\s,]+)', sub_text)
            for fm in fac_matches:
                cleaned_fm = fm.split("\n")[0].strip()
                if len(cleaned_fm) > 3 and len(cleaned_fm) < 50:
                    data["faculties"].append(cleaned_fm)
                    
    data["extra_emails"] = list(set([e.lower() for e in data["extra_emails"]]))
    data["extra_phones"] = list(set(data["extra_phones"]))
    data["faculties"] = list(set(data["faculties"]))
    
    return data

def process_institution(item):
    name = item['name']
    url = item['detail_url']
    inst_type = item['type']
    
    log = []
    log.append(f"Visiting detail page: {url}")
    
    html = get_html(url)
    if not html:
        return None, log
        
    soup = BeautifulSoup(html, 'html.parser')
    
    inst = {
        "id": url.split('/')[-2] if len(url.split('/')) > 2 else "",
        "official_name": name,
        "short_name": "",
        "institution_type": inst_type,
        "sector": "training" if inst_type == "seta" else "higher education",
        "province": "",
        "city": "",
        "detail_source": url,
        "official_website": "",
        "application_url": "",
        "prospectus_url": "",
        "contact_emails": [],
        "contact_phone_numbers": [],
        "physical_address": "",
        "postal_address": "",
        "campuses": [],
        "faculties": [],
        "qualification_types": [],
        "distance_learning": None,
        "nsfas_supported": None,
        "student_accommodation": None,
        "accreditation": {
            "dh et": "Accredited" if inst_type in ["university", "university-of-technology", "tvet-college"] else None,
            "saqa": "Registered" if inst_type in ["university", "university-of-technology"] else None
        },
        "socials": {
            "facebook": "",
            "instagram": "",
            "linkedin": "",
            "x": "",
            "youtube": ""
        },
        "sources": [url]
    }
    
    # Parse national government page table
    for tr in soup.find_all('tr'):
        th = tr.find('th')
        td = tr.find('td')
        if th and td:
            key = th.text.strip().lower()
            val = td.text.strip()
            if 'website' in key or 'web' in key:
                a = td.find('a')
                if a:
                    inst['official_website'] = clean_url(a['href'])
                elif val:
                    inst['official_website'] = clean_url(val)
            elif 'email' in key:
                inst['contact_emails'].extend([e.strip() for e in val.split(',') if e.strip()])
            elif 'tel' in key or 'phone' in key:
                # Filter out garbage phone numbers
                parts = [p.strip() for p in val.split(',') if p.strip()]
                for p in parts:
                    if len(p) >= 10:
                        inst['contact_phone_numbers'].append(p)
            elif 'postal' in key:
                inst['postal_address'] = val
            elif 'physical' in key:
                inst['physical_address'] = val

    # Determine province
    prov = extract_province_from_text(inst['physical_address'])
    if not prov:
        prov = extract_province_from_text(inst['postal_address'])
    if not prov:
        prov = extract_province_from_text(name)
    inst['province'] = prov
    
    # Determine city
    inst['city'] = extract_city_from_address(inst['physical_address'])
    if not inst['city']:
        inst['city'] = extract_city_from_address(inst['postal_address'])
        
    # City-to-province fallback
    if not inst['province'] and inst['city']:
        city_lower = inst['city'].lower()
        if city_lower in CITY_TO_PROVINCE:
            inst['province'] = CITY_TO_PROVINCE[city_lower]
        else:
            # Sub-match check
            for city_key, prov_val in CITY_TO_PROVINCE.items():
                if city_key in city_lower or city_lower in city_key:
                    inst['province'] = prov_val
                    break

    # Website Deep Crawl
    if inst['official_website']:
        log.append(f"Deep crawling website: {inst['official_website']}")
        inst['sources'].append(inst['official_website'])
        site_data = crawl_site(inst['official_website'])
        
        # Merge crawled data
        inst['faculties'].extend(site_data['faculties'])
        inst['socials'] = site_data['socials']
        inst['nsfas_supported'] = site_data['nsfas_supported']
        inst['student_accommodation'] = site_data['student_accommodation']
        if site_data['application_url']:
            inst['application_url'] = site_data['application_url']
        if site_data['prospectus_url']:
            inst['prospectus_url'] = site_data['prospectus_url']
            
        # Merge contact details and filter garbage
        for e in site_data['extra_emails']:
            if '@' in e and '.' in e:
                inst['contact_emails'].append(e)
                
        for p in site_data['extra_phones']:
            cleaned_p = re.sub(r'[^\d+ ]', '', p).strip()
            if len(cleaned_p) >= 10:
                inst['contact_phone_numbers'].append(cleaned_p)

    # Clean up lists
    inst['contact_emails'] = list(set([e.lower() for e in inst['contact_emails'] if e]))
    inst['contact_phone_numbers'] = list(set([p for p in inst['contact_phone_numbers'] if p]))
    inst['faculties'] = list(set(inst['faculties']))
    
    # Inferred qualification types
    if inst_type == "university":
        inst["qualification_types"] = ["Undergraduate", "Postgraduate", "Diploma", "Certificate"]
    elif inst_type == "university-of-technology":
        inst["qualification_types"] = ["National Diploma", "BTech", "Advanced Diploma", "Postgraduate"]
    elif inst_type == "tvet-college":
        inst["qualification_types"] = ["NC(V)", "Nated (Report 191)", "Skills Programmes", "Apprenticeships"]
        
    return inst, log

def main():
    with open('list_items.json', 'r') as f:
        items = json.load(f)
            
    results = []
    crawl_log = []
    
    # Process all items concurrently using 25 workers
    with concurrent.futures.ThreadPoolExecutor(max_workers=25) as executor:
        future_to_item = {executor.submit(process_institution, item): item for item in items}
        for future in concurrent.futures.as_completed(future_to_item):
            try:
                inst, logs = future.result()
                crawl_log.extend(logs)
                if inst:
                    results.append(inst)
            except Exception as e:
                item = future_to_item[future]
                crawl_log.append(f"Failed processing {item['name']}: {e}")
                
    # Gather unique provinces and types
    provinces = list(set([inst['province'] for inst in results if inst['province']]))
    types = list(set([inst['institution_type'] for inst in results if inst['institution_type']]))
    
    output = {
        "institutions": results,
        "provinces": provinces,
        "institution_types": types,
        "crawl_log": crawl_log
    }
    
    # Save directly to the seed path
    target_path = '/Users/nonwork/dev/seo/ilithiyana/lib/seed/institutions.json'
    with open(target_path, 'w') as f:
        json.dump(output, f, indent=2)
        
    # Also save a temporary backup in current dir
    with open('result.json', 'w') as f:
        json.dump(output, f, indent=2)
        
    print(f"Successfully processed {len(results)} institutions!")

if __name__ == "__main__":
    main()
