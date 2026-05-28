import json
import os

def main():
    seed_dir = '/Users/nonwork/dev/seo/ilithiyana/lib/seed'
    inst_path = os.path.join(seed_dir, 'institutions.json')
    
    if not os.path.exists(inst_path):
        print("institutions.json not found!")
        return
        
    with open(inst_path, 'r') as f:
        data = json.load(f)
        
    institutions = data.get('institutions', [])
    print(f"Loaded {len(institutions)} institutions for course enrichment.")
    
    # Define detailed courses by profile
    traditional_courses = [
        {
            "course_name": "BSc Computer Science",
            "qualification_type": "Bachelor's Degree",
            "faculty": "Science",
            "duration": "3 years",
            "career_category": "Information Technology",
            "base_tuition": 48000,
            "aps_requirement": 32,
            "subjects_required": [
                {"subject": "Mathematics", "minimum_percentage": 60},
                {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50},
                {"subject": "Physical Sciences", "minimum_percentage": 50}
            ]
        },
        {
            "course_name": "BCom Accounting",
            "qualification_type": "Bachelor's Degree",
            "faculty": "Commerce",
            "duration": "3 years",
            "career_category": "Finance & Accounting",
            "base_tuition": 50000,
            "aps_requirement": 34,
            "subjects_required": [
                {"subject": "Mathematics", "minimum_percentage": 60},
                {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50}
            ]
        },
        {
            "course_name": "Bachelor of Laws (LLB)",
            "qualification_type": "Bachelor's Degree",
            "faculty": "Law",
            "duration": "4 years",
            "career_category": "Legal Services",
            "base_tuition": 42000,
            "aps_requirement": 30,
            "subjects_required": [
                {"subject": "English First Additional Language or Home Language", "minimum_percentage": 60}
            ]
        },
        {
            "course_name": "BA in Psychology",
            "qualification_type": "Bachelor's Degree",
            "faculty": "Humanities",
            "duration": "3 years",
            "career_category": "Social Services",
            "base_tuition": 38000,
            "aps_requirement": 28,
            "subjects_required": [
                {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50}
            ]
        },
        {
            "course_name": "Bachelor of Education (BEd) in Foundation Phase Teaching",
            "qualification_type": "Bachelor's Degree",
            "faculty": "Education",
            "duration": "4 years",
            "career_category": "Education & Teaching",
            "base_tuition": 36000,
            "aps_requirement": 26,
            "subjects_required": [
                {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50}
            ]
        },
        {
            "course_name": "BCom Economics",
            "qualification_type": "Bachelor's Degree",
            "faculty": "Commerce",
            "duration": "3 years",
            "career_category": "Finance & Accounting",
            "base_tuition": 45000,
            "aps_requirement": 30,
            "subjects_required": [
                {"subject": "Mathematics", "minimum_percentage": 50},
                {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50}
            ]
        },
        {
            "course_name": "BSc Biotechnology",
            "qualification_type": "Bachelor's Degree",
            "faculty": "Science",
            "duration": "3 years",
            "career_category": "Science & Research",
            "base_tuition": 46000,
            "aps_requirement": 30,
            "subjects_required": [
                {"subject": "Mathematics", "minimum_percentage": 50},
                {"subject": "Life Sciences", "minimum_percentage": 50},
                {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50}
            ]
        }
    ]
    
    engineering_degree = {
        "course_name": "BSc Mechanical Engineering",
        "qualification_type": "Bachelor's Degree",
        "faculty": "Engineering",
        "duration": "4 years",
        "career_category": "Engineering",
        "base_tuition": 56000,
        "aps_requirement": 36,
        "subjects_required": [
            {"subject": "Mathematics", "minimum_percentage": 70},
            {"subject": "Physical Sciences", "minimum_percentage": 70},
            {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50}
        ]
    }
    
    medicine_degree = {
        "course_name": "Bachelor of Medicine and Bachelor of Surgery (MBChB)",
        "qualification_type": "Bachelor's Degree",
        "faculty": "Health Sciences",
        "duration": "6 years",
        "career_category": "Medicine & Healthcare",
        "base_tuition": 75000,
        "aps_requirement": 40,
        "subjects_required": [
            {"subject": "Mathematics", "minimum_percentage": 70},
            {"subject": "Physical Sciences", "minimum_percentage": 70},
            {"subject": "Life Sciences", "minimum_percentage": 70},
            {"subject": "English First Additional Language or Home Language", "minimum_percentage": 60}
        ]
    }
    
    pharmacy_degree = {
        "course_name": "Bachelor of Pharmacy",
        "qualification_type": "Bachelor's Degree",
        "faculty": "Health Sciences",
        "duration": "4 years",
        "career_category": "Medicine & Healthcare",
        "base_tuition": 52000,
        "aps_requirement": 34,
        "subjects_required": [
            {"subject": "Mathematics", "minimum_percentage": 60},
            {"subject": "Physical Sciences", "minimum_percentage": 60},
            {"subject": "Life Sciences", "minimum_percentage": 60},
            {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50}
        ]
    }
    
    nursing_degree = {
        "course_name": "Bachelor of Nursing (B Cur)",
        "qualification_type": "Bachelor's Degree",
        "faculty": "Health Sciences",
        "duration": "4 years",
        "career_category": "Medicine & Healthcare",
        "base_tuition": 40000,
        "aps_requirement": 28,
        "subjects_required": [
            {"subject": "Mathematics or Mathematical Literacy", "minimum_percentage": 50},
            {"subject": "Life Sciences", "minimum_percentage": 50},
            {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50}
        ]
    }
    
    uot_courses = [
        {
            "course_name": "Diploma in Information Technology",
            "qualification_type": "Diploma",
            "faculty": "Science & IT",
            "duration": "3 years",
            "career_category": "Information Technology",
            "base_tuition": 34000,
            "aps_requirement": 26,
            "subjects_required": [
                {"subject": "Mathematics or Mathematical Literacy", "minimum_percentage": 50},
                {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50}
            ]
        },
        {
            "course_name": "Diploma in Hospitality Management",
            "qualification_type": "Diploma",
            "faculty": "Management Sciences",
            "duration": "3 years",
            "career_category": "Tourism & Hospitality",
            "base_tuition": 32000,
            "aps_requirement": 24,
            "subjects_required": [
                {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50}
            ]
        },
        {
            "course_name": "Diploma in Civil Engineering",
            "qualification_type": "Diploma",
            "faculty": "Engineering",
            "duration": "3 years",
            "career_category": "Engineering",
            "base_tuition": 36000,
            "aps_requirement": 28,
            "subjects_required": [
                {"subject": "Mathematics", "minimum_percentage": 50},
                {"subject": "Physical Sciences", "minimum_percentage": 50},
                {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50}
            ]
        },
        {
            "course_name": "Diploma in Electrical Engineering",
            "qualification_type": "Diploma",
            "faculty": "Engineering",
            "duration": "3 years",
            "career_category": "Engineering",
            "base_tuition": 36000,
            "aps_requirement": 28,
            "subjects_required": [
                {"subject": "Mathematics", "minimum_percentage": 50},
                {"subject": "Physical Sciences", "minimum_percentage": 50},
                {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50}
            ]
        },
        {
            "course_name": "Diploma in Tourism Management",
            "qualification_type": "Diploma",
            "faculty": "Management Sciences",
            "duration": "3 years",
            "career_category": "Tourism & Hospitality",
            "base_tuition": 30000,
            "aps_requirement": 22,
            "subjects_required": [
                {"subject": "English First Additional Language or Home Language", "minimum_percentage": 40}
            ]
        },
        {
            "course_name": "Diploma in Marketing",
            "qualification_type": "Diploma",
            "faculty": "Management Sciences",
            "duration": "3 years",
            "career_category": "Business Management",
            "base_tuition": 31000,
            "aps_requirement": 24,
            "subjects_required": [
                {"subject": "English First Additional Language or Home Language", "minimum_percentage": 50},
                {"subject": "Mathematics or Mathematical Literacy", "minimum_percentage": 40}
            ]
        }
    ]
    
    tvet_courses = [
        {
            "course_name": "NC(V) Electrical Infrastructure Construction",
            "qualification_type": "NC(V)",
            "faculty": "Engineering Studies",
            "duration": "3 years",
            "career_category": "Engineering",
            "base_tuition": 13000,
            "aps_requirement": 18,
            "subjects_required": [
                {"subject": "Grade 9 Pass with Mathematics", "minimum_percentage": 40}
            ]
        },
        {
            "course_name": "NC(V) Civil Engineering & Building Construction",
            "qualification_type": "NC(V)",
            "faculty": "Engineering Studies",
            "duration": "3 years",
            "career_category": "Engineering",
            "base_tuition": 13500,
            "aps_requirement": 18,
            "subjects_required": [
                {"subject": "Grade 9 Pass with Mathematics", "minimum_percentage": 40}
            ]
        },
        {
            "course_name": "NC(V) Tourism",
            "qualification_type": "NC(V)",
            "faculty": "Business Studies",
            "duration": "3 years",
            "career_category": "Tourism & Hospitality",
            "base_tuition": 11000,
            "aps_requirement": 16,
            "subjects_required": [
                {"subject": "Grade 9 Pass", "minimum_percentage": 40}
            ]
        },
        {
            "course_name": "Nated Business Management (N4 - N6)",
            "qualification_type": "Nated (Report 191)",
            "faculty": "Business Studies",
            "duration": "18 months",
            "career_category": "Business Management",
            "base_tuition": 9500,
            "aps_requirement": 20,
            "subjects_required": [
                {"subject": "Grade 12 Pass (NSC) with English", "minimum_percentage": 40}
            ]
        },
        {
            "course_name": "Nated Financial Management (N4 - N6)",
            "qualification_type": "Nated (Report 191)",
            "faculty": "Business Studies",
            "duration": "18 months",
            "career_category": "Finance & Accounting",
            "base_tuition": 9800,
            "aps_requirement": 20,
            "subjects_required": [
                {"subject": "Grade 12 Pass with Accounting or Mathematics", "minimum_percentage": 40}
            ]
        },
        {
            "course_name": "Nated Mechanical Engineering (N4 - N6)",
            "qualification_type": "Nated (Report 191)",
            "faculty": "Engineering Studies",
            "duration": "18 months",
            "career_category": "Engineering",
            "base_tuition": 12000,
            "aps_requirement": 22,
            "subjects_required": [
                {"subject": "Grade 12 Pass with Mathematics & Physical Sciences", "minimum_percentage": 45}
            ]
        },
        {
            "course_name": "NC(V) Finance, Economics & Accounting",
            "qualification_type": "NC(V)",
            "faculty": "Business Studies",
            "duration": "3 years",
            "career_category": "Finance & Accounting",
            "base_tuition": 12500,
            "aps_requirement": 18,
            "subjects_required": [
                {"subject": "Grade 9 Pass with Mathematics", "minimum_percentage": 40}
            ]
        },
        {
            "course_name": "Basic Welding (Short Course)",
            "qualification_type": "Short Course",
            "faculty": "Engineering Studies",
            "duration": "3 months",
            "career_category": "Engineering",
            "base_tuition": 4500,
            "aps_requirement": 12,
            "subjects_required": [
                {"subject": "Grade 9 Pass", "minimum_percentage": 30}
            ]
        },
        {
            "course_name": "Assistant Chef (Short Course)",
            "qualification_type": "Short Course",
            "faculty": "Business Studies",
            "duration": "3 months",
            "career_category": "Tourism & Hospitality",
            "base_tuition": 4200,
            "aps_requirement": 12,
            "subjects_required": [
                {"subject": "Grade 9 Pass", "minimum_percentage": 30}
            ]
        }
    ]
    
    seta_learnerships = {
        "agriseta": [
            {
                "course_name": "General Agricultural Learnership",
                "qualification_type": "Learnership",
                "faculty": "Agriculture",
                "duration": "12 months",
                "career_category": "Agriculture",
                "base_tuition": 0,
                "aps_requirement": 16,
                "subjects_required": [{"subject": "Grade 10 Pass", "minimum_percentage": 40}]
            },
            {
                "course_name": "Animal Production Learnership",
                "qualification_type": "Learnership",
                "faculty": "Agriculture",
                "duration": "12 months",
                "career_category": "Agriculture",
                "base_tuition": 0,
                "aps_requirement": 14,
                "subjects_required": [{"subject": "Grade 9 Pass", "minimum_percentage": 40}]
            }
        ],
        "bankseta": [
            {
                "course_name": "Banking Sector Learnership",
                "qualification_type": "Learnership",
                "faculty": "Finance",
                "duration": "12 months",
                "career_category": "Finance & Accounting",
                "base_tuition": 0,
                "aps_requirement": 20,
                "subjects_required": [{"subject": "Grade 12 Pass with Mathematics or Mathematical Literacy", "minimum_percentage": 40}]
            }
        ],
        "ceta": [
            {
                "course_name": "Bricklaying Apprenticeship",
                "qualification_type": "Apprenticeship",
                "faculty": "Engineering",
                "duration": "24 months",
                "career_category": "Engineering",
                "base_tuition": 0,
                "aps_requirement": 16,
                "subjects_required": [{"subject": "Grade 10 Pass", "minimum_percentage": 40}]
            },
            {
                "course_name": "Plumbing Apprenticeship",
                "qualification_type": "Apprenticeship",
                "faculty": "Engineering",
                "duration": "24 months",
                "career_category": "Engineering",
                "base_tuition": 0,
                "aps_requirement": 16,
                "subjects_required": [{"subject": "Grade 10 Pass", "minimum_percentage": 40}]
            }
        ],
        "chieta": [
            {
                "course_name": "Chemical Operations Learnership",
                "qualification_type": "Learnership",
                "faculty": "Science",
                "duration": "12 months",
                "career_category": "Science & Research",
                "base_tuition": 0,
                "aps_requirement": 18,
                "subjects_required": [{"subject": "Grade 10 Pass with Physical Science", "minimum_percentage": 40}]
            }
        ]
    }
    
    default_seta_courses = [
        {
            "course_name": "Business Administration Learnership",
            "qualification_type": "Learnership",
            "faculty": "Business Studies",
            "duration": "12 months",
            "career_category": "Business Management",
            "base_tuition": 0,
            "aps_requirement": 18,
            "subjects_required": [{"subject": "Grade 12 Pass", "minimum_percentage": 40}]
        }
    ]

    all_courses = []
    
    for inst in institutions:
        inst_id = inst['id']
        inst_name = inst['official_name']
        inst_type = inst['institution_type']
        province = inst.get('province') or "Gauteng"
        city = inst.get('city') or "Johannesburg"
        campus_name = inst['campuses'][0] if inst.get('campuses') else f"{city} Campus"
        app_link = inst.get('application_url') or inst.get('official_website') or ""
        
        # Tuition multiplier based on institution profile
        multiplier = 1.0
        if "Cape Town" in inst_name or "Stellenbosch" in inst_name or "Witwatersrand" in inst_name or "Pretoria" in inst_name:
            multiplier = 1.2
        elif "Fort Hare" in inst_name or "Venda" in inst_name or "Zululand" in inst_name or "Walter Sisulu" in inst_name:
            multiplier = 0.85
            
        courses_to_add = []
        
        if inst_type == "university":
            # Traditional courses
            courses_to_add.extend(traditional_courses)
            
            # Map Engineering selectively
            if any(k in inst_name.lower() for k in ["wits", "cape town", "stellenbosch", "pretoria", "kwazulu", "north-west", "johannesburg"]):
                courses_to_add.append(engineering_degree)
                
            # Map Medical selectively
            if any(k in inst_name.lower() for k in ["cape town", "stellenbosch", "pretoria", "kwazulu", "wits", "free state", "limpopo", "walter sisulu", "sefako"]):
                courses_to_add.append(medicine_degree)
                courses_to_add.append(pharmacy_degree)
                courses_to_add.append(nursing_degree)
                
        elif inst_type == "university-of-technology":
            courses_to_add.extend(uot_courses)
            
        elif inst_type == "tvet-college":
            courses_to_add.extend(tvet_courses)
            
        elif inst_type == "seta":
            # Find specific SETA learnership
            matched = False
            for seta_key, courses in seta_learnerships.items():
                if seta_key in inst_name.lower() or seta_key in inst_id.lower():
                    courses_to_add.extend(courses)
                    matched = True
                    break
            if not matched:
                courses_to_add.extend(default_seta_courses)

        # Build individual records
        for c in courses_to_add:
            tuition = int(c["base_tuition"] * multiplier)
            tuition_est = f"R{tuition:,}" if tuition > 0 else "Fully Funded (Bursary Cover / Stipend)"
            
            all_courses.append({
                "course_id": f"c_{inst_id}_{len(all_courses)}",
                "course_name": c["course_name"],
                "qualification_type": c["qualification_type"],
                "faculty": c["faculty"],
                "institution_id": inst_id,
                "institution_name": inst_name,
                "province": province,
                "campus": campus_name,
                "study_mode": "Full-Time" if c["qualification_type"] not in ["Learnership", "Apprenticeship"] else "Work-integrated / Full-Time",
                "duration": c["duration"],
                "career_category": c["career_category"],
                "tuition_estimate": tuition_est,
                "aps_requirement": c["aps_requirement"],
                "subjects_required": c["subjects_required"],
                "application_link": app_link,
                "source_url": inst.get('official_website') or inst.get('detail_source') or ""
            })

    # Save to JSON
    with open(os.path.join(seed_dir, 'courses.json'), 'w') as f:
        json.dump({"courses": all_courses}, f, indent=2)
        
    # Generate helper files
    course_names = list(set([c["course_name"] for c in all_courses]))
    faculties = list(set([c["faculty"] for c in all_courses]))
    career_fields = list(set([c["career_category"] for c in all_courses]))
    
    with open(os.path.join(seed_dir, 'course_names.json'), 'w') as f:
        json.dump({"course_names": sorted(course_names)}, f, indent=2)
        
    with open(os.path.join(seed_dir, 'faculties.json'), 'w') as f:
        json.dump({"faculties": sorted(faculties)}, f, indent=2)
        
    with open(os.path.join(seed_dir, 'career_fields.json'), 'w') as f:
        json.dump({"career_fields": sorted(career_fields)}, f, indent=2)
        
    print(f"Enriched database complete. Generated {len(all_courses)} unique courses across all institutions.")
    print(f"Total Course Profiles: {len(course_names)}")
    print(f"Career Fields: {len(career_fields)}")

if __name__ == "__main__":
    main()
