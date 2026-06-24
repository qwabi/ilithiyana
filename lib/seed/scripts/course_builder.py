import json
import urllib.request
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin
import os
import concurrent.futures

headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

def get_html(url):
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.read().decode('utf-8', errors='ignore')
    except Exception:
        return ""

def crawl_courses_from_site(website_url):
    courses = []
    html = get_html(website_url)
    if not html:
        return courses
        
    soup = BeautifulSoup(html, 'html.parser')
    links = soup.find_all('a', href=True)
    
    courses_url = ""
    for link in links:
        href = link['href'].strip().lower()
        text = link.text.strip().lower()
        if any(k in text or k in href for k in ["courses", "what-to-study", "programmes", "academic-programmes", "faculties", "undergraduate"]):
            courses_url = urljoin(website_url, link['href'])
            break
            
    if not courses_url:
        courses_url = website_url
        
    courses_html = get_html(courses_url)
    if not courses_html:
        return courses
        
    courses_soup = BeautifulSoup(courses_html, 'html.parser')
    
    # Heuristics to find course names (typically in headers or lists)
    for tag in courses_soup.find_all(['h3', 'h4', 'li', 'a']):
        text = tag.text.strip()
        # Look for typical degree/diploma structures
        if len(text) > 5 and len(text) < 70:
            if any(keyword in text.lower() for keyword in ["bachelor", "diploma", "certificate", "bsc", "bcom", "ba ", "beng", "national diploma", "nc(v)", "nated"]):
                # Clean up the name
                cleaned_name = re.sub(r'\s+', ' ', text).strip()
                if cleaned_name and cleaned_name not in courses:
                    courses.append(cleaned_name)
                    
    return courses[:15] # Limit per site for performance

def main():
    seed_dir = '/Users/nonwork/dev/seo/ilithiyana/lib/seed'
    inst_path = os.path.join(seed_dir, 'institutions.json')
    
    if not os.path.exists(inst_path):
        print("institutions.json not found!")
        return
        
    with open(inst_path, 'r') as f:
        data = json.load(f)
        
    institutions = data.get('institutions', [])
    
    print(f"Loaded {len(institutions)} institutions.")
    
    # 1. Define standard course mapping templates
    templates = {
        "university": [
            {
                "course_name": "BSc Computer Science",
                "qualification_type": "Bachelor's Degree",
                "faculty": "Science",
                "duration": "3 years",
                "career_category": "Information Technology",
                "tuition_estimate": "R45,000 - R55,000",
                "aps_requirement": 32,
                "subjects_required": ["Mathematics (min 60%)", "English (min 50%)", "Physical Sciences (min 50%)"]
            },
            {
                "course_name": "BCom Accounting",
                "qualification_type": "Bachelor's Degree",
                "faculty": "Commerce",
                "duration": "3 years",
                "career_category": "Finance & Accounting",
                "tuition_estimate": "R48,000 - R58,000",
                "aps_requirement": 34,
                "subjects_required": ["Mathematics (min 60%)", "English (min 50%)"]
            },
            {
                "course_name": "Bachelor of Laws (LLB)",
                "qualification_type": "Bachelor's Degree",
                "faculty": "Law",
                "duration": "4 years",
                "career_category": "Legal Services",
                "tuition_estimate": "R40,000 - R50,000",
                "aps_requirement": 30,
                "subjects_required": ["English (min 60%)"]
            },
            {
                "course_name": "BSc Mechanical Engineering",
                "qualification_type": "Bachelor's Degree",
                "faculty": "Engineering",
                "duration": "4 years",
                "career_category": "Engineering",
                "tuition_estimate": "R55,000 - R65,000",
                "aps_requirement": 36,
                "subjects_required": ["Mathematics (min 70%)", "Physical Sciences (min 70%)", "English (min 50%)"]
            },
            {
                "course_name": "Bachelor of Education (BEd) in Foundation Phase Teaching",
                "qualification_type": "Bachelor's Degree",
                "faculty": "Education",
                "duration": "4 years",
                "career_category": "Education & Teaching",
                "tuition_estimate": "R35,000 - R42,000",
                "aps_requirement": 26,
                "subjects_required": ["English (min 50%)", "Home Language (min 50%)"]
            },
            {
                "course_name": "BA in Psychology",
                "qualification_type": "Bachelor's Degree",
                "faculty": "Humanities",
                "duration": "3 years",
                "career_category": "Social Services",
                "tuition_estimate": "R38,000 - R45,000",
                "aps_requirement": 28,
                "subjects_required": ["English (min 50%)"]
            },
            {
                "course_name": "Bachelor of Medicine and Bachelor of Surgery (MBChB)",
                "qualification_type": "Bachelor's Degree",
                "faculty": "Health Sciences",
                "duration": "6 years",
                "career_category": "Medicine & Healthcare",
                "tuition_estimate": "R70,000 - R85,000",
                "aps_requirement": 40,
                "subjects_required": ["Mathematics (min 70%)", "Physical Sciences (min 70%)", "Life Sciences (min 70%)", "English (min 60%)"]
            }
        ],
        "university-of-technology": [
            {
                "course_name": "Diploma in Information Technology",
                "qualification_type": "Diploma",
                "faculty": "Science & IT",
                "duration": "3 years",
                "career_category": "Information Technology",
                "tuition_estimate": "R32,000 - R38,000",
                "aps_requirement": 26,
                "subjects_required": ["Mathematics (min 50%) or Mathematical Literacy (min 70%)", "English (min 50%)"]
            },
            {
                "course_name": "Diploma in Hospitality Management",
                "qualification_type": "Diploma",
                "faculty": "Management Sciences",
                "duration": "3 years",
                "career_category": "Tourism & Hospitality",
                "tuition_estimate": "R30,000 - R36,000",
                "aps_requirement": 24,
                "subjects_required": ["English (min 50%)"]
            },
            {
                "course_name": "Diploma in Civil Engineering",
                "qualification_type": "Diploma",
                "faculty": "Engineering",
                "duration": "3 years",
                "career_category": "Engineering",
                "tuition_estimate": "R35,000 - R42,000",
                "aps_requirement": 28,
                "subjects_required": ["Mathematics (min 50%)", "Physical Sciences (min 50%)", "English (min 50%)"]
            },
            {
                "course_name": "Diploma in Tourism Management",
                "qualification_type": "Diploma",
                "faculty": "Management Sciences",
                "duration": "3 years",
                "career_category": "Tourism & Hospitality",
                "tuition_estimate": "R28,000 - R34,000",
                "aps_requirement": 22,
                "subjects_required": ["English (min 40%)"]
            }
        ],
        "tvet-college": [
            {
                "course_name": "NC(V) Electrical Infrastructure Construction",
                "qualification_type": "NC(V)",
                "faculty": "Engineering Studies",
                "duration": "3 years",
                "career_category": "Engineering",
                "tuition_estimate": "R12,000 - R18,000",
                "aps_requirement": 20,
                "subjects_required": ["Grade 9 Pass with Mathematics"]
            },
            {
                "course_name": "NC(V) Tourism",
                "qualification_type": "NC(V)",
                "faculty": "Business Studies",
                "duration": "3 years",
                "career_category": "Tourism & Hospitality",
                "tuition_estimate": "R10,000 - R15,000",
                "aps_requirement": 18,
                "subjects_required": ["Grade 9 Pass"]
            },
            {
                "course_name": "Nated Business Management (N4 - N6)",
                "qualification_type": "Nated (Report 191)",
                "faculty": "Business Studies",
                "duration": "18 months",
                "career_category": "Business Management",
                "tuition_estimate": "R8,000 - R12,000",
                "aps_requirement": 20,
                "subjects_required": ["Grade 12 Pass (NSC)"]
            },
            {
                "course_name": "Nated Mechanical Engineering (N1 - N6)",
                "qualification_type": "Nated (Report 191)",
                "faculty": "Engineering Studies",
                "duration": "12 months",
                "career_category": "Engineering",
                "tuition_estimate": "R9,000 - R14,000",
                "aps_requirement": 18,
                "subjects_required": ["Grade 9 Pass (for N1) / Grade 12 with Math & Science (for N4)"]
            }
        ],
        "seta": [
            {
                "course_name": "General Agricultural Learnership",
                "qualification_type": "Learnership",
                "faculty": "Agriculture",
                "duration": "12 months",
                "career_category": "Agriculture",
                "tuition_estimate": "Fully Funded / Stipend Provided",
                "aps_requirement": 16,
                "subjects_required": ["Grade 10 Pass"]
            },
            {
                "course_name": "Banking Sector Learnership",
                "qualification_type": "Learnership",
                "faculty": "Finance",
                "duration": "12 months",
                "career_category": "Finance & Accounting",
                "tuition_estimate": "Fully Funded / Stipend Provided",
                "aps_requirement": 20,
                "subjects_required": ["Grade 12 Pass with Mathematics or Mathematical Literacy"]
            }
        ]
    }
    
    # 2. Collect actual courses from top sites concurrently
    print("Crawling top sites for custom courses...")
    crawled_custom = {}
    top_institutions = [inst for inst in institutions if inst.get('official_website')][:10]
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        future_to_inst = {executor.submit(crawl_courses_from_site, inst['official_website']): inst for inst in top_institutions}
        for future in concurrent.futures.as_completed(future_to_inst):
            inst = future_to_inst[future]
            try:
                scraped = future.result()
                if scraped:
                    crawled_custom[inst['id']] = scraped
                    print(f"Scraped {len(scraped)} courses from {inst['official_name']}")
            except Exception as e:
                print(f"Error scraping {inst['official_name']}: {e}")

    # 3. Assemble courses database
    courses_db = []
    
    for inst in institutions:
        inst_id = inst['id']
        inst_name = inst['official_name']
        inst_type = inst['institution_type']
        province = inst.get('province', 'Gauteng')
        campus = inst['campuses'][0] if inst.get('campuses') else (inst['city'] + " Campus" if inst.get('city') else "Main Campus")
        app_link = inst.get('application_url') or inst.get('official_website') or ""
        
        # Get standard courses for this type
        type_courses = templates.get(inst_type, templates["university"])
        
        # Merge crawled custom courses if they exist
        custom_names = crawled_custom.get(inst_id, [])
        for name in custom_names:
            # Create a custom course entry based on the name
            # Guess faculty & type based on words
            qual_type = "Bachelor's Degree"
            faculty = "Humanities"
            career = "Social Services"
            aps = 26
            subj = ["English"]
            duration = "3 years"
            
            if "science" in name.lower() or "bsc" in name.lower() or "it" in name.lower() or "information" in name.lower():
                qual_type = "Bachelor's Degree" if inst_type == "university" else "Diploma"
                faculty = "Science & IT"
                career = "Information Technology"
                aps = 28
                subj = ["Mathematics", "English"]
            elif "commerce" in name.lower() or "bcom" in name.lower() or "accounting" in name.lower() or "business" in name.lower():
                qual_type = "Bachelor's Degree" if inst_type == "university" else "Diploma"
                faculty = "Commerce"
                career = "Finance & Accounting"
                aps = 30
                subj = ["Mathematics", "English"]
            elif "engineer" in name.lower() or "beng" in name.lower() or "engineering" in name.lower():
                qual_type = "Bachelor's Degree" if inst_type == "university" else "Diploma"
                faculty = "Engineering"
                career = "Engineering"
                aps = 32
                subj = ["Mathematics", "Physical Sciences", "English"]
                duration = "4 years" if inst_type == "university" else "3 years"
            elif "diploma" in name.lower():
                qual_type = "Diploma"
                aps = 22
            elif "certificate" in name.lower() or "nc(v)" in name.lower():
                qual_type = "Certificate"
                aps = 18
                duration = "1 year"
                
            courses_db.append({
                "course_id": f"c_{inst_id}_{len(courses_db)}",
                "course_name": name,
                "qualification_type": qual_type,
                "faculty": faculty,
                "institution_id": inst_id,
                "institution_name": inst_name,
                "province": province,
                "campus": campus,
                "study_mode": "Full-Time",
                "duration": duration,
                "career_category": career,
                "tuition_estimate": "R30,000 - R45,000",
                "aps_requirement": aps,
                "subjects_required": subj,
                "application_link": app_link,
                "source_url": inst.get('official_website') or ""
            })
            
        # Add templated courses to ensure we have a robust, search-friendly list
        for t in type_courses:
            courses_db.append({
                "course_id": f"c_{inst_id}_{len(courses_db)}",
                "course_name": t["course_name"],
                "qualification_type": t["qualification_type"],
                "faculty": t["faculty"],
                "institution_id": inst_id,
                "institution_name": inst_name,
                "province": province,
                "campus": campus,
                "study_mode": "Full-Time" if inst_type != "seta" else "Distance/Part-time",
                "duration": t["duration"],
                "career_category": t["career_category"],
                "tuition_estimate": t["tuition_estimate"],
                "aps_requirement": t["aps_requirement"],
                "subjects_required": t["subjects_required"],
                "application_link": app_link,
                "source_url": inst.get('official_website') or ""
            })
            
    # 4. Generate deduplicated helper lists
    course_names = list(set([c["course_name"] for c in courses_db]))
    faculties = list(set([c["faculty"] for c in courses_db]))
    career_fields = list(set([c["career_category"] for c in courses_db]))
    
    # 5. Save all files to the seed path
    os.makedirs(seed_dir, exist_ok=True)
    
    with open(os.path.join(seed_dir, 'courses.json'), 'w') as f:
        json.dump({"courses": courses_db}, f, indent=2)
        
    with open(os.path.join(seed_dir, 'course_names.json'), 'w') as f:
        json.dump({"course_names": sorted(course_names)}, f, indent=2)
        
    with open(os.path.join(seed_dir, 'faculties.json'), 'w') as f:
        json.dump({"faculties": sorted(faculties)}, f, indent=2)
        
    with open(os.path.join(seed_dir, 'career_fields.json'), 'w') as f:
        json.dump({"career_fields": sorted(career_fields)}, f, indent=2)
        
    print(f"Successfully created database with {len(courses_db)} courses!")
    print(f"Deduplicated Course Names: {len(course_names)}")
    print(f"Faculties: {len(faculties)}")
    print(f"Career Fields: {len(career_fields)}")

if __name__ == "__main__":
    main()
