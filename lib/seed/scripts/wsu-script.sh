python3 << 'PYEOF'
import json

# Parse the WSU raw table data from the document
# Based on our analysis of the pageTables JSON, here's what we know:
# - Institution: Walter Sisulu University (WSU) - from page 1 "www.wsu.ac.za" and "Walter Sisulu University"
# - APS system: WSU APS (custom conversion table, max 8 per subject, different from standard NSC)
# - Page 3: Global admission rules (Higher Cert, Diploma, Bachelor min requirements)
# - Page 4: WSU APS conversion table
# - Pages 6,8,12,16,19,22,25: Programme listing tables (Qual Code, SAQA, Name, NQF, Credits, Duration, Campus)
# - Pages 7,9,10,13,14,17,20,21,23,26,27,28: QUAL DETAILS | APS | Subject Requirements | Programme Overview tables

# Reconstruct from the table data we can read from the document
# The raw JSON had all this content - let me build the structured output

WSU_DATA = {
    "institution_id": "378",
    "institution_name": "Walter Sisulu University",
    "institution_type": "university-of-technology",
    "source_file": "prospectuses/walter-sisulu-university-of-technology-and-science.pdf",
    "campuses": [
        {"name": "Mthatha (Ibika) Campus", "city": "Mthatha", "province": "Eastern Cape", "is_main": True},
        {"name": "Buffalo City Campus", "city": "East London", "province": "Eastern Cape", "is_main": False},
        {"name": "Butterworth Campus", "city": "Butterworth", "province": "Eastern Cape", "is_main": False},
        {"name": "Komani Campus", "city": "Komani (Queenstown)", "province": "Eastern Cape", "is_main": False},
    ],
    "admission_policy": {
        "aps_name": "WSU APS",
        "aps_calculation_notes": (
            "WSU uses its own APS conversion, scoring up to 8 points per subject. "
            "NSC Level 7 (90-100%) = 8pts; Level 7 (80-89%) = 7pts; Level 6 (70-79%) = 6pts; "
            "Level 5 (60-69%) = 5pts; Level 4 (50-59%) = 4pts; Level 3 (40-49%) = 3pts; "
            "Level 2 (30-39%) = 2pts; Level 1 (0-30%) = 1pt. "
            "Old Matric HG: 90-100=8, 80-89=7, 70-79=6, 60-69=5, 50-59=4, 40-49=3, 30-39=2, 0-30=1. "
            "Old Matric SG: 90-100=7, 80-89=6, 70-79=5, 60-69=4, 50-59=3, 40-49=2, 30-39=1, 0-30=0. "
            "APS allocated for max 6 subjects: Category 1 = 2 languages (Home + FAL); "
            "Category 2 = 4 highest-scoring subjects excluding Life Orientation and Category 1, "
            "must include required subjects for the qualification."
        ),
        "minimum_aps_for_bachelors": None,
        "minimum_aps_for_diplomas": None,
        "minimum_entry_note": (
            "Higher Certificate: NSC with min 30% in language of learning and teaching (LOLT). "
            "Diploma: NSC with min 30% LOLT + achievement rating 3 (40-49%) in 4 recognised 20-credit subjects (excl. LO). "
            "Bachelor's Degree: NSC with min 30% LOLT + achievement rating 4 (50-59%) in 4 recognised 20-credit subjects (excl. LO). "
            "Students applying for Diploma must have NSC with Diploma endorsement; "
            "Bachelor's programmes require Bachelor's endorsement."
        ),
        "life_orientation_cap": None,
        "source_excerpt": "WSU APS Conversion Tables. NSC Level 7 90-100 = 8pts. Category 1: 2 Languages. Category 2: 4 highest subjects excl. LO and Cat 1.",
        "extraction_confidence": 0.95
    },
    "faculties": [
        {
            "name": "Faculty of Economic Sciences, Development and Business Studies",
            "kind": "faculty",
            "overview": "Offers accounting, financial information systems, auditing, commerce, and business management qualifications at diploma and degree level.",
            "institution_id": "378",
            "institution_name": "Walter Sisulu University",
            "source_file": "prospectuses/walter-sisulu-university-of-technology-and-science.pdf",
            "source_excerpt": "Diploma in Accountancy W63001 | Diploma in Financial Information Systems W63002 | Bachelor of Accounting W63008 | Bachelor of Commerce W63010",
            "extraction_confidence": 0.9
        },
        {
            "name": "Faculty of Education",
            "kind": "faculty",
            "overview": "Trains teachers for Foundation Phase (Grades R-3) and Senior Phase & FET (Grades 7-12) across multiple specialisations.",
            "institution_id": "378",
            "institution_name": "Walter Sisulu University",
            "source_file": "prospectuses/walter-sisulu-university-of-technology-and-science.pdf",
            "source_excerpt": "Bachelor of Education in Foundation Phase Teaching W62006 | Bachelor of Education in Senior Phase & FET Teaching W62007-W62012 W62018 W62019",
            "extraction_confidence": 0.9
        },
        {
            "name": "Faculty of Engineering and Technology",
            "kind": "faculty",
            "overview": "Offers diplomas in building, civil, electrical, and mechanical engineering, plus ICT specialisations.",
            "institution_id": "378",
            "institution_name": "Walter Sisulu University",
            "source_file": "prospectuses/walter-sisulu-university-of-technology-and-science.pdf",
            "source_excerpt": "Diploma in Building Technology W60001 | Diploma in Civil Engineering W60003 | Diploma in Electrical Engineering W60005 | Diploma in Mechanical Engineering W60007 | Diploma in ICT W60009-W60016",
            "extraction_confidence": 0.9
        },
        {
            "name": "Faculty of Humanities and Social Sciences",
            "kind": "faculty",
            "overview": "Offers Arts, Social Sciences, Law, Psychology, and Social Work degrees plus Fashion and Fine Art diplomas.",
            "institution_id": "378",
            "institution_name": "Walter Sisulu University",
            "source_file": "prospectuses/walter-sisulu-university-of-technology-and-science.pdf",
            "source_excerpt": "Bachelor of Arts W66004 | Bachelor of Social Science W66007-W66020 | Bachelor of Laws W66021 | Bachelor of Psychology W66022 | Bachelor of Social Work W66023",
            "extraction_confidence": 0.9
        },
        {
            "name": "Faculty of Management and Commerce",
            "kind": "faculty",
            "overview": "Offers a wide range of management, hospitality, HR, public management, journalism, policing and other professional diplomas plus the Bachelor of Administration.",
            "institution_id": "378",
            "institution_name": "Walter Sisulu University",
            "source_file": "prospectuses/walter-sisulu-university-of-technology-and-science.pdf",
            "source_excerpt": "Diploma in Administrative Management W61002 | Diploma in Hospitality Management W61003 | Diploma in Human Resources Management W61004 | Bachelor of Administration W61029",
            "extraction_confidence": 0.9
        },
        {
            "name": "Faculty of Health Sciences",
            "kind": "faculty",
            "overview": "Offers medical science, clinical practice, nursing, orthotics/prosthetics, and MBBCh programmes at Mthatha campus.",
            "institution_id": "378",
            "institution_name": "Walter Sisulu University",
            "source_file": "prospectuses/walter-sisulu-university-of-technology-and-science.pdf",
            "source_excerpt": "Bachelor of Medical Sciences W65001 | Bachelor of Medicine in Clinical Practice W65002 | Bachelor of Nursing W65004 | Bachelor of Medicine and Bachelor of Surgery W65006",
            "extraction_confidence": 0.9
        },
        {
            "name": "Faculty of Natural Sciences",
            "kind": "faculty",
            "overview": "Offers science and technology diplomas (analytical chemistry, food nutrition, pest management) and bachelor's degrees in applied maths, biological sciences, computer science, physics, chemistry and more.",
            "institution_id": "378",
            "institution_name": "Walter Sisulu University",
            "source_file": "prospectuses/walter-sisulu-university-of-technology-and-science.pdf",
            "source_excerpt": "Diploma in Analytical Chemistry W64001 | Bachelor of Science in Applied Mathematics W64007 | Bachelor of Science in Computer Science W64015 | Bachelor of Science in Physics W64023",
            "extraction_confidence": 0.9
        }
    ],
    "programmes": [],
    "admission_requirements": [
        {
            "rule_type": "general_admission",
            "programme_name": None,
            "faculty_name": None,
            "detail": "Higher Certificate minimum: NSC with min 30% in language of learning and teaching, certified by Umalusi",
            "institution_id": "378",
            "institution_name": "Walter Sisulu University",
            "source_file": "prospectuses/walter-sisulu-university-of-technology-and-science.pdf",
            "source_excerpt": "Higher Certificate: minimum admission requirement is a National Senior Certificate with a minimum of 30% in the language of learning and teaching of the higher education institution as certified by Umalusi",
            "extraction_confidence": 0.97
        },
        {
            "rule_type": "general_admission",
            "programme_name": None,
            "faculty_name": None,
            "detail": "Diploma minimum: NSC with 30% LOLT + achievement rating 3 (40-49%) in 4 recognised 20-credit subjects excluding LO",
            "institution_id": "378",
            "institution_name": "Walter Sisulu University",
            "source_file": "prospectuses/walter-sisulu-university-of-technology-and-science.pdf",
            "source_excerpt": "Diploma: minimum admission requirement is NSC with min 30% in LOLT and achievement rating of 3 (40-49%) or better for 4 recognised 20-credit subjects, excluding life orientation",
            "extraction_confidence": 0.97
        },
        {
            "rule_type": "general_admission",
            "programme_name": None,
            "faculty_name": None,
            "detail": "Bachelor's Degree minimum: NSC with 30% LOLT + achievement rating 4 (50-59%) in 4 recognised 20-credit subjects excluding LO",
            "institution_id": "378",
            "institution_name": "Walter Sisulu University",
            "source_file": "prospectuses/walter-sisulu-university-of-technology-and-science.pdf",
            "source_excerpt": "Bachelor's Degree: minimum admission requirement is NSC with min 30% in LOLT and achievement rating of 4 (50-59%) or better for 4 recognised 20-credit subjects, excluding life orientation",
            "extraction_confidence": 0.97
        },
        {
            "rule_type": "general_admission",
            "programme_name": None,
            "faculty_name": None,
            "detail": "Diploma applicants must have NSC with Diploma endorsement; Bachelor's applicants must have Bachelor's endorsement",
            "institution_id": "378",
            "institution_name": "Walter Sisulu University",
            "source_file": "prospectuses/walter-sisulu-university-of-technology-and-science.pdf",
            "source_excerpt": "Students applying for Diploma programmes must have a National Senior Certificate (NSC) with at least a diploma endorsement. Students applying for Degree programmes must have a NSC with a Bachelor's endorsement.",
            "extraction_confidence": 0.97
        }
    ],
    "aps_rules": []
}

# Build programmes array from the table data
# Format: (name, code, saqa, nqf, credits, duration_years, campus, faculty, aps, subjects_list, overview, selection)
PROGRAMMES_RAW = [
    # === FACULTY OF ECONOMIC SCIENCES ===
    ("Diploma in Accountancy", "W63001", "114798", 6, 360, "3", "Mthatha",
     "Faculty of Economic Sciences, Development and Business Studies", 21,
     [("English HL or FAL", 3, 40), ("Mathematics", 3, 40), ("Two additional subjects", 3, 40)],
     "Provides graduates with skills to fulfil financial, taxation, auditing, and management accounting responsibilities. Foundation for pursuing Accounting Technician or CMA qualifications.",
     False),

    ("Diploma in Financial Information Systems", "W63002", "101210", 6, 360, "3", "Mthatha",
     "Faculty of Economic Sciences, Development and Business Studies", 21,
     [("English HL or FAL", 3, 40), ("Mathematics", 3, 40), ("Two additional subjects", 3, 40)],
     "Equips graduates with competencies in financial and information system activities including accounting, taxation, auditing, and management accounting. Foundation for CMA and Accounting Technician qualifications.",
     False),

    ("Diploma in Internal Auditing", "W63004", "101212", 6, 360, "3", "Mthatha",
     "Faculty of Economic Sciences, Development and Business Studies", 21,
     [("English HL or FAL", 3, 40), ("Mathematics or Accounting", 3, 40)],
     "Equips graduates with skills to perform financial and operational audit functions. Foundation for further studies in accounting and internal auditing.",
     False),

    ("Diploma in Internal Auditing (Extended Curriculum Programme)", "W63005", "101212", 6, 360, "4", "Mthatha",
     "Faculty of Economic Sciences, Development and Business Studies", 20,
     [("English HL or FAL", 3, 40), ("Mathematics or Accounting", 3, 40)],
     "Extended curriculum version of Diploma in Internal Auditing with additional foundational year.",
     False),

    ("Bachelor of Accounting", "W63008", "78283", 7, 360, "3", "Mthatha",
     "Faculty of Economic Sciences, Development and Business Studies", 25,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50)],
     "Prepares students with financial, analytical, and managerial skills for commerce and industry. Develops competencies for informed financial decisions and resource management.",
     False),

    ("Bachelor of Accounting Sciences", "W63009", "114813", 7, 480, "4", "Mthatha",
     "Faculty of Economic Sciences, Development and Business Studies", 27,
     [("English HL or FAL", 5, 60), ("Mathematics", 4, 50)],
     "Comprehensive undergraduate education for the Chartered Accountant (CA) route. Prepares for CTA program and CA(SA) designation. Also qualifies for Registered General Accountant.",
     False),

    ("Bachelor of Commerce", "W63010", "80806", 7, 360, "3", "Mthatha",
     "Faculty of Economic Sciences, Development and Business Studies", 25,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40)],
     "Imparts knowledge of fundamental principles and practices in commerce-related subjects. Equips candidates to make valuable contributions to the business world.",
     False),

    ("Bachelor of Commerce in Business Management", "W63011", "112328", 7, 360, "3", "Mthatha",
     "Faculty of Economic Sciences, Development and Business Studies", 25,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40)],
     "Empowers students with logical and critical thinking for well-informed business decisions. Emphasises information acquisition, organisation, analysis, and electronic-based activities.",
     False),

    ("Bachelor of Commerce in Economics", "W63012", "112323", 7, 360, "3", "Mthatha",
     "Faculty of Economic Sciences, Development and Business Studies", 25,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40)],
     "Imparts knowledge of micro- and macro-economic principles. Fosters independent thinking and critical evaluation skills to address 21st century socioeconomic challenges.",
     False),

    # === FACULTY OF EDUCATION ===
    ("Bachelor of Education in Foundation Phase Teaching", "W62006", "101196", 7, 480, "4", "Mthatha/Komani",
     "Faculty of Education", 24,
     [("IsiXhosa HL", 4, 50), ("English FAL", 4, 50), ("Mathematics or Mathematical Literacy", 2, 30), ("Life Orientation", 5, 60)],
     "Initial professional teacher qualification for Grades R-3. Provides depth and specialised knowledge, practical skills through research and workplace experience.",
     False),

    ("Bachelor of Education in Senior Phase & FET Teaching (Creative Arts History)", "W62007", "117038", 7, 480, "4", "Mthatha",
     "Faculty of Education", 24,
     [("English HL or FAL", 4, 50), ("Other African Language", 4, 50), ("History", 4, 50), ("Music/Dance Studies/Dramatic Arts/Visual Arts", 4, 50)],
     "Provides well-rounded education with subject content knowledge, educational theory, and methodology for competent beginner SP & FET teachers. Music Aptitude Test required for applicants without Music at matric.",
     False),

    ("Bachelor of Education in Senior Phase & FET Teaching (Creative Arts English)", "W62019", "117038", 7, 480, "4", "Mthatha",
     "Faculty of Education", 24,
     [("English HL or FAL", 5, 60), ("Other African Language", 4, 50), ("Music/Dance Studies/Dramatic Arts/Visual Arts", 4, 50)],
     "Provides well-rounded education with subject content knowledge, educational theory, and methodology for competent beginner SP & FET teachers. Music Aptitude Test required for applicants without Music at matric.",
     False),

    ("Bachelor of Education in Senior Phase & FET Teaching (Consumer & Management Science)", "W62008", "117038", 7, 480, "4", "Mthatha",
     "Faculty of Education", 24,
     [("English HL or FAL", 4, 50), ("Other African Language", 4, 50)],
     "Provides well-rounded education for SP & FET teachers in Consumer Studies/Hospitality/Tourism.",
     False),

    ("Bachelor of Education in Senior Phase & FET Teaching (Economic & Management Science)", "W62009", "117038", 7, 480, "4", "Mthatha/Komani",
     "Faculty of Education", 24,
     [("English HL or FAL", 4, 50), ("Other African Language", 4, 50), ("Mathematics or Mathematical Literacy", 2, 30)],
     "Provides well-rounded education for SP & FET teachers in Economic & Management Science.",
     False),

    ("Bachelor of Education in Senior Phase & FET Teaching (Humanities)", "W62010", "117038", 7, 480, "4", "Mthatha/Komani",
     "Faculty of Education", 24,
     [("English HL or FAL", 4, 50), ("Other African Language", 4, 50), ("History", 4, 50), ("Geography", 4, 50)],
     "Provides well-rounded education for SP & FET teachers in Humanities (History and Geography).",
     False),

    ("Bachelor of Education in Senior Phase & FET Teaching (Languages)", "W62011", "117038", 7, 480, "4", "Mthatha/Komani",
     "Faculty of Education", 24,
     [("English HL or FAL", 5, 60), ("Xhosa HL or FAL", 4, 50)],
     "Provides well-rounded education for SP & FET teachers in Languages.",
     False),

    ("Bachelor of Education in Senior Phase & FET Teaching (Maths, Science & Technology)", "W62012", "117038", 7, 480, "4", "Mthatha/Komani",
     "Faculty of Education", 24,
     [("English HL or FAL", 4, 50), ("Other African Language", 4, 50), ("Mathematics", 4, 50)],
     "Provides well-rounded education for SP & FET teachers in Mathematics, Science and Technology.",
     False),

    ("Bachelor of Education in Senior Phase & FET Teaching (Technical and Vocational Education)", "W62018", "117038", 7, 480, "4", "Mthatha",
     "Faculty of Education", 24,
     [("English HL or FAL", 4, 50), ("Other African Language", 4, 50)],
     "Provides well-rounded education for SP & FET teachers in Technical and Vocational subjects including Technical Mathematics, Technical Sciences, Engineering Graphics and Design, Civil/Electrical/Mechanical Technology.",
     False),

    # === FACULTY OF ENGINEERING AND TECHNOLOGY ===
    ("Diploma in Building Technology", "W60001", "101196", 6, 360, "3", "Buffalo City/Butterworth",
     "Faculty of Engineering and Technology", 24,
     [("English HL or FAL", 4, 50), ("Mathematics or Technical Mathematics", 4, 50), ("Physical Science or Technical Science", 3, 40)],
     "Prepares learners for supervisory and middle management in building industry. Trains technicians for Quantity Surveying and Construction Management. Covers tendering, pricing, measuring, payments and site management.",
     False),

    ("Diploma in Building Technology (ECP)", "W60002", "101196", 6, 360, "4", "Buffalo City/Butterworth",
     "Faculty of Engineering and Technology", 22,
     [("English HL or FAL", 3, 40), ("Mathematics or Technical Mathematics", 3, 40), ("Physical Science or Technical Science", 3, 40)],
     "Extended Curriculum Programme version of Diploma in Building Technology.",
     False),

    ("Diploma in Civil Engineering", "W60003", "101195", 6, 360, "3", "Buffalo City/Butterworth",
     "Faculty of Engineering and Technology", 24,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 4, 50)],
     "Builds knowledge for becoming a competent practising engineering technician. Meets ECSA criteria for Candidate Engineering Technician registration. Covers civil engineering problem identification and solution.",
     False),

    ("Diploma in Civil Engineering (ECP)", "W60004", "101195", 6, 360, "4", "Buffalo City/Butterworth",
     "Faculty of Engineering and Technology", 22,
     [("English HL or FAL", 3, 40), ("Mathematics", 3, 40), ("Physical Sciences", 3, 40)],
     "Extended Curriculum Programme version of Diploma in Civil Engineering.",
     False),

    ("Diploma in Electrical Engineering", "W60005", "101197", 6, 360, "3", "Buffalo City",
     "Faculty of Engineering and Technology", 24,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 4, 50)],
     "Trains electrical engineering technicians for ECSA Candidate Engineering Technician registration. Competent in identification and solution of electrical engineering problems.",
     False),

    ("Diploma in Electrical Engineering (ECP)", "W60006", "101197", 6, 360, "4", "Buffalo City",
     "Faculty of Engineering and Technology", 22,
     [("English HL or FAL", 3, 40), ("Mathematics", 3, 40), ("Physical Sciences", 3, 40)],
     "Extended Curriculum Programme version of Diploma in Electrical Engineering.",
     False),

    ("Diploma in Mechanical Engineering", "W60007", "101198", 6, 360, "3", "Buffalo City",
     "Faculty of Engineering and Technology", 24,
     [("English HL or FAL", 4, 50), ("Mathematics or Technical Mathematics", 4, 50), ("Physical Science or Technical Science", 4, 50)],
     "Trains mechanical engineering technicians for ECSA Candidate Engineering Technician registration. Competent in identification and solution of mechanical engineering problems.",
     False),

    ("Diploma in Mechanical Engineering (ECP)", "W60008", "101198", 6, 360, "4", "Buffalo City",
     "Faculty of Engineering and Technology", 22,
     [("English HL or FAL", 3, 40), ("Mathematics or Technical Mathematics", 3, 40), ("Physical Science or Technical Science", 3, 40)],
     "Extended Curriculum Programme version of Diploma in Mechanical Engineering.",
     False),

    ("Diploma in ICT in Applications Development", "W60009", "101175", 6, 360, "3", "Buffalo City",
     "Faculty of Engineering and Technology", 22,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40)],
     "Professional and vocational qualification for ICT industry. Enables graduates to conceptualize, design, develop, implement, and test reliable application development solutions.",
     False),

    ("Diploma in ICT in Applications Development (ECP)", "W60010", "101175", 6, 360, "4", "Buffalo City",
     "Faculty of Engineering and Technology", 18,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40)],
     "Extended Curriculum Programme version of Diploma in ICT in Applications Development.",
     False),

    ("Diploma in ICT in Business Analysis", "W60011", "101194", 6, 360, "3", "Buffalo City",
     "Faculty of Engineering and Technology", 22,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40)],
     "Enables graduates to analyse business environments and design reliable ICT specifications to facilitate alignment and integration of ICT with business processes.",
     False),

    ("Diploma in ICT in Business Analysis (ECP)", "W60012", "101194", 6, 360, "4", "Buffalo City",
     "Faculty of Engineering and Technology", 18,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40)],
     "Extended Curriculum Programme version of Diploma in ICT in Business Analysis.",
     False),

    ("Diploma in ICT in Communication Networks", "W60013", "101193", 6, 360, "3", "Buffalo City",
     "Faculty of Engineering and Technology", 22,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40)],
     "Trains network technicians to design, develop, implement, and manage reliable computer networks. Aligned with international industry certification in computer networking. Pathway to network engineer.",
     False),

    ("Diploma in ICT in Communication Networks (ECP)", "W60014", "101193", 6, 360, "4", "Buffalo City",
     "Faculty of Engineering and Technology", 18,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40)],
     "Extended Curriculum Programme version of Diploma in ICT in Communication Networks.",
     False),

    ("Diploma in ICT in Support Services", "W60015", "101176", 6, 360, "3", "Buffalo City",
     "Faculty of Engineering and Technology", 22,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40)],
     "Trains IT support technicians to identify and design ICT solutions, maintain equipment, manage call centres, and provide IT support services. Pathway to IS management, auditing, and security.",
     False),

    ("Diploma in ICT in Support Services (ECP)", "W60016", "101176", 6, 360, "4", "Buffalo City",
     "Faculty of Engineering and Technology", 18,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40)],
     "Extended Curriculum Programme version of Diploma in ICT in Support Services.",
     False),

    # === FACULTY OF HUMANITIES AND SOCIAL SCIENCES ===
    ("Diploma in Fashion", "W66001", "97040", 6, 360, "3", "Buffalo City",
     "Faculty of Humanities and Social Sciences", 19,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy or Accountancy", 2, 30)],
     "Provides fashion designing and manufacturing skills for entry into the fashion industry. Projects are both theoretical and skills-based with portfolio of creative work as evidence.",
     True),

    ("Diploma in Fine Art", "W66002", "97041", 6, 360, "3", "Buffalo City",
     "Faculty of Humanities and Social Sciences", 19,
     [("English HL or FAL", 3, 40)],
     "Provides educational base for further studies in fine arts. Enables diverse career paths in culture and arts sector and contributes to economic sustainability through entrepreneurship.",
     True),

    ("Bachelor of Arts", "W66004", "80197", 7, 360, "3", "Mthatha",
     "Faculty of Humanities and Social Sciences", 25,
     [("English HL or FAL", 4, 50), ("IsiXhosa/Sesotho/Geography/History", 4, 50)],
     "General degree allowing students to major in 3 subjects at first year and 2 majors at second and third year. Equips with undergraduate knowledge in preparation for Honours specialisation.",
     False),

    ("Bachelor of Arts (English)", "W66029", "80197", 7, 360, "3", "Mthatha",
     "Faculty of Humanities and Social Sciences", 25,
     [("English", 5, 50), ("IsiXhosa/Sesotho/Geography/History", 4, 50)],
     "General degree with English as a major. Allows 3 subjects at first year and 2 majors at second and third year.",
     False),

    ("Bachelor of Social Sciences", "W66007", "115218", 7, 360, "3", "Mthatha",
     "Faculty of Humanities and Social Sciences", 25,
     [("English HL or FAL", 4, 50), ("Four subjects", 4, 50)],
     "Promotes academic competence, community engagement, research competence and professionalism in social and human development using a multidisciplinary approach. Prepares for roles in government and non-government sectors.",
     False),

    ("Bachelor of Laws", "W66021", "117039", 7, 512, "4", "Mthatha",
     "Faculty of Humanities and Social Sciences", 26,
     [("English HL or FAL", 5, 60), ("Mathematics or Mathematical Literacy", 3, 40)],
     "4-year degree providing knowledge, skills, and values of South African law and legal system. Prepares for entry into legal practice and postgraduate studies in law.",
     False),

    ("Bachelor of Psychology", "W66022", "80194", 7, 512, "4", "Mthatha",
     "Faculty of Humanities and Social Sciences", 26,
     [("English HL or FAL", 4, 50), ("Other African Language", 4, 50), ("Life Sciences", 4, 50)],
     "4-year degree providing comprehensive understanding of cognitive processes, human development, and behaviour. Character reference checks conducted for all admitted students.",
     True),

    ("Bachelor of Social Work", "W66023", "111505", 7, 516, "4", "Mthatha",
     "Faculty of Humanities and Social Sciences", 26,
     [("English HL or FAL", 4, 50), ("Other African Language", 5, 60), ("Life Sciences", 4, 50)],
     "Professional 4-year degree covering human well-being, social maladies, social development and social justice. Produces competitive graduates responsive to psycho-socio-economic needs of marginalised communities. Character reference checks conducted.",
     True),

    # === FACULTY OF MANAGEMENT AND COMMERCE ===
    ("Higher Certificate in Versatile Broadcasting", "W61001", "97037", 5, 120, "1", "Buffalo City",
     "Faculty of Management and Commerce", 18,
     [("English HL or FAL", 4, 50), ("Other language", 3, 40), ("Two additional subjects", 3, 40)],
     "Provides skills and knowledge for mass communication across journalism, radio, television, film, and digital media platforms.",
     False),

    ("Diploma in Administrative Management", "W61002", "114801", 6, 360, "3", "Butterworth",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 2, 30), ("Two additional subjects", 4, 50)],
     "Graduates can identify and solve problems, make responsible and ethical decisions, and work effectively as part of a team.",
     False),

    ("Diploma in Hospitality Management", "W61003", "97042", 6, 360, "3", "Butterworth",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40), ("Three relevant school subjects", 3, 40)],
     "Provides knowledge, skills, and attitudes for careers in hotels, lodges, B&Bs, restaurants, fine dining, and health food service institutions.",
     False),

    ("Diploma in Human Resources Management", "W61004", "97043", 6, 360, "3", "Butterworth/Komani",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 3, 40), ("Mathematics or Mathematical Literacy", 3, 40), ("Two school subjects", 3, 40)],
     "Produces HR practitioners who are critical thinkers able to practise locally and globally, improve management-employee-union relations, and ensure legislative compliance.",
     False),

    ("Diploma in Human Resources Management (ECP)", "W61005", "97043", 6, 360, "4", "Butterworth/Komani",
     "Faculty of Management and Commerce", 20,
     [("English HL or FAL", 3, 40), ("Mathematics or Mathematical Literacy", 2, 30), ("Two school subjects", 3, 40)],
     "Extended Curriculum Programme version of Diploma in Human Resources Management.",
     False),

    ("Diploma in Journalism", "W61006", "97044", 6, 360, "3", "Buffalo City",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 5, 60), ("Other language", 4, 50), ("Two additional subjects", 4, 50)],
     "Focuses on gathering, assessing and presenting news and information through print, electronic and social media. Teaches advanced industry-specific methods using state-of-the-art equipment.",
     False),

    ("Diploma in Local Government Finance", "W61007", "97045", 6, 360, "3", "Butterworth/Komani",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 3, 40), ("Accounting or Mathematics or Mathematical Literacy", 3, 40)],
     "Graduates perform municipal finance and operational audit functions. Prepares for careers in municipal finance, accounting, auditing, financial analysis, or advising.",
     False),

    ("Diploma in Local Government Finance (ECP)", "W61008", "97045", 6, 360, "4", "Butterworth/Komani",
     "Faculty of Management and Commerce", 20,
     [("English HL or FAL", 3, 40), ("Accounting or Mathematics or Mathematical Literacy", 2, 30)],
     "Extended Curriculum Programme version of Diploma in Local Government Finance.",
     False),

    ("Diploma in Management", "W61009", "97046", 6, 360, "3", "Butterworth",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 3, 40), ("Accounting", 3, 40), ("Mathematics or Mathematical Literacy", 3, 40)],
     "Graduates apply management principles, procedures, and processes. Develop responsible and ethically mindful professionals.",
     False),

    ("Diploma in Management (ECP)", "W61010", "97046", 6, 360, "4", "Butterworth",
     "Faculty of Management and Commerce", 20,
     [("English HL or FAL", 3, 40), ("Accounting", 2, 30), ("Mathematics or Mathematical Literacy", 2, 30)],
     "Extended Curriculum Programme version of Diploma in Management.",
     False),

    ("Diploma in Marketing Management", "W61011", "97048", 6, 360, "3", "Butterworth",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 3, 40), ("Mathematics or Mathematical Literacy", 3, 40), ("Two other subjects", 3, 40)],
     "Focuses on benefiting products, generating sales, building customer loyalty, acquiring new customers, and expanding to new markets using Digital Marketing.",
     False),

    ("Diploma in Policing", "W61012", "97050", 6, 360, "3", "Butterworth",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 3, 40), ("Four other subjects", 3, 40)],
     "Prepares graduates in law enforcement. Uplifts professional standards of policing and regulates relationships between community and law enforcement agencies.",
     False),

    ("Diploma in Office Management & Technology", "W61013", "97049", 6, 360, "3", "Butterworth",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40), ("Two other subjects", 4, 50)],
     "Produces multi-skilled graduates with managerial, administrative, financial management, HR, legal, technological, and communication skills for the African communities they serve.",
     False),

    ("Diploma in Office Management & Technology (ECP)", "W61014", "97049", 6, 360, "4", "Butterworth",
     "Faculty of Management and Commerce", 19,
     [("English HL or FAL", 3, 40), ("Mathematics or Mathematical Literacy", 2, 30), ("Two other subjects", 3, 40)],
     "Extended Curriculum Programme version of Diploma in Office Management & Technology.",
     False),

    ("Diploma in Public Management", "W61015", "97051", 6, 360, "3", "Butterworth/Komani",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 3, 40), ("Four other subjects", 3, 40)],
     "Graduates provide strategic leadership and management support to public officials. Produces well-qualified, efficient, client-oriented public officials for all spheres of government.",
     False),

    ("Diploma in Public Relations Management", "W61016", "101179", 6, 360, "3", "Butterworth",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 5, 60), ("Other language", 4, 50), ("Two other subjects", 4, 50)],
     "Focuses on building mutually beneficial relationships between organisations and public. Covers corporate image, crisis communication, media relations, and corporate social investment.",
     False),

    ("Diploma in Public Relations Management (ECP)", "W61017", "101179", 6, 360, "4", "Butterworth",
     "Faculty of Management and Commerce", 19,
     [("English HL or FAL", 4, 50), ("Other language", 3, 40), ("Two other subjects", 3, 40)],
     "Extended Curriculum Programme version of Diploma in Public Relations Management.",
     False),

    ("Diploma in Small Business Management", "W61018", "117828", 6, 360, "3", "Butterworth",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 3, 40), ("Mathematics or Accounting or Mathematical Literacy", 3, 40), ("Two other subjects", 3, 40)],
     "Prepares graduates for the business world. Develops competence to apply business strategies to start and effectively run a small, medium or micro-enterprise.",
     False),

    ("Diploma in Sport Management", "W61019", "97052", 6, 360, "3", "Butterworth",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 3, 40), ("Three other subjects", 3, 40)],
     "Provides applied competence in analysis, interpretation and application of management principles in fitness, coaching, teaching and retailing sectors of the sports industry.",
     False),

    ("Diploma in Tourism Management", "W61020", "97053", 6, 360, "3", "Butterworth",
     "Faculty of Management and Commerce", 21,
     [("English HL or FAL", 4, 50), ("Mathematics or Mathematical Literacy", 3, 40), ("Three relevant school subjects", 3, 40)],
     "Provides comprehensive understanding of tourism and leisure industries. Equips learners to independently manage and integrate specialist activities within the tourism value chain.",
     False),

    ("Bachelor of Administration", "W61029", "80826", 7, 360, "3", "Butterworth",
     "Faculty of Management and Commerce", 25,
     [("English HL or FAL", 4, 50), ("Four other subjects", 4, 50)],
     "Enables students to direct, improve, and manage institutional structures, resources, and functions to improve public sector service delivery. Prepares for postgraduate studies and organisational leadership.",
     False),

    # === FACULTY OF HEALTH SCIENCES ===
    ("Bachelor of Medical Sciences", "W65001", "87492", 7, 360, "3", "Mthatha",
     "Faculty of Health Sciences", 24,
     [("English HL or FAL", 4, 50), ("Other African Language", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 4, 50), ("Life Sciences", 4, 50)],
     "Equips learner with knowledge and skills in general pre-medical or basic sciences. First year common with non-medical sciences; Year 2 onwards specialisation in Physiology or Biochemistry.",
     True),

    ("Bachelor of Medicine in Clinical Practice", "W65002", "97150", 7, 360, "3", "Mthatha",
     "Faculty of Health Sciences", 24,
     [("English HL or FAL", 4, 50), ("Other African Language", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 4, 50), ("Life Sciences", 4, 50)],
     "3-year degree to train competent Clinical Associates (CA) to assist district hospital doctors with defined clinical procedures under supervision.",
     True),

    ("Bachelor of Nursing", "W65004", "118180", 7, 480, "4", "Mthatha",
     "Faculty of Health Sciences", 24,
     [("English HL or FAL", 4, 50), ("Other African Language", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 4, 50), ("Life Sciences", 4, 50)],
     "Produces competent professional nurse practitioners with comprehensive scope including obstetric skills, mental health, and primary health care.",
     True),

    ("Bachelor of Health Sciences in Medical Orthotics and Prosthetics", "W65005", "111953", 7, 480, "4", "Mthatha",
     "Faculty of Health Sciences", 24,
     [("English HL or FAL", 4, 50), ("Other African Language", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 4, 50), ("Life Sciences", 4, 50)],
     "Produces well-rounded orthotic and prosthetic clinicians. Medical Prosthetics replaces body limbs removed by accident/disease/surgery. Medical Orthotics supports and treats weak limbs.",
     True),

    ("Bachelor of Medicine and Bachelor of Surgery (MBBCh)", "W65006", "80128", 7, 720, "6", "Mthatha",
     "Faculty of Health Sciences", 30,
     [("English HL or FAL", 5, 60), ("Other African Language", 5, 60), ("Mathematics", 5, 60), ("Physical Sciences", 5, 60), ("Life Sciences", 5, 60)],
     "6-year innovative medical programme using PBL and community-based approach. Equips learner to manage diverse health problems in individuals, families and communities.",
     True),

    # === FACULTY OF NATURAL SCIENCES ===
    ("Diploma in Analytical Chemistry", "W64001", "97039", 6, 360, "3", "Buffalo City",
     "Faculty of Natural Sciences", 22,
     [("English HL or FAL", 4, 50), ("Mathematics", 3, 40), ("Physical Sciences", 4, 50)],
     "Specialized knowledge and skills for chemical and chemical-allied industries: pharmaceuticals, manufacturing, food, mining, petrochemicals, environmental, wastewater. Empowers graduates for innovation and entrepreneurship.",
     False),

    ("Diploma in Analytical Chemistry (ECP)", "W64002", "97039", 6, 360, "4", "Buffalo City",
     "Faculty of Natural Sciences", 20,
     [("English HL or FAL", 3, 40), ("Mathematics", 3, 40), ("Physical Sciences", 4, 50)],
     "Extended Curriculum Programme version of Diploma in Analytical Chemistry.",
     False),

    ("Diploma in Consumer Science in Food and Nutrition", "W64004", "96787", 6, 360, "3", "Buffalo City",
     "Faculty of Natural Sciences", 22,
     [("English HL or FAL", 4, 50), ("Mathematics", 3, 40), ("Physical Sciences", 4, 50)],
     "Produces graduates competent in science-based food and nutrition knowledge and culinary skills for food production, retail, and service. Empowers food scientists and nutritionists.",
     False),

    ("Diploma in Consumer Science in Food and Nutrition (ECP)", "W64039", "96787", 6, 360, "4", "Buffalo City",
     "Faculty of Natural Sciences", 20,
     [("English HL or FAL", 4, 50), ("Mathematics", 3, 40), ("Physical Sciences", 3, 40)],
     "Extended Curriculum Programme version of Diploma in Consumer Science in Food and Nutrition.",
     False),

    ("Diploma in Pest Management", "W64005", "112034", 6, 360, "3", "Mthatha",
     "Faculty of Natural Sciences", 21,
     [("English HL or FAL", 4, 50), ("Mathematics", 3, 40), ("Life Sciences", 3, 40), ("Physical Sciences", 3, 40)],
     "Provides knowledge to diagnose pest problems and use pest control equipment. Covers agricultural pests, damage diagnostics, and communication with farmers on integrated pest control.",
     False),

    ("Bachelor of Science in Applied Mathematics", "W64007", "101254", 7, 480, "3", "Mthatha",
     "Faculty of Natural Sciences", 25,
     [("English HL or FAL", 4, 50), ("Mathematics", 5, 60), ("Physical Sciences", 4, 50)],
     "Provides basic mathematical knowledge for technical problem-solving in the marketplace and further training in Mathematical Sciences specialisations.",
     False),

    ("Bachelor of Science in Applied Mathematics (ECP)", "W64008", "101254", 7, 360, "4", "Mthatha",
     "Faculty of Natural Sciences", 23,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 3, 40)],
     "Extended Curriculum Programme version of Bachelor of Science in Applied Mathematics.",
     False),

    ("Bachelor of Science in Applied Statistical Sciences", "W64009", "101255", 7, 360, "3", "Mthatha",
     "Faculty of Natural Sciences", 25,
     [("English HL or FAL", 4, 50), ("Mathematics", 5, 60), ("Physical Sciences", 4, 50)],
     "Provides statistical knowledge in Applied Mathematics, Computer Science, Mathematics and Statistics for application in technical problem-solving.",
     False),

    ("Bachelor of Science in Applied Statistical Sciences (ECP)", "W64010", "101255", 7, 360, "4", "Mthatha",
     "Faculty of Natural Sciences", 23,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 3, 40)],
     "Extended Curriculum Programme version of Bachelor of Science in Applied Statistical Sciences.",
     False),

    ("Bachelor of Science in Biological Sciences", "W64011", "112304", 7, 360, "3", "Mthatha",
     "Faculty of Natural Sciences", 25,
     [("English HL or FAL", 4, 50), ("Mathematics", 5, 60), ("Physical Sciences", 5, 60), ("Life Sciences", 5, 60)],
     "Develops skills for scientific investigations on plants and animals including microscopy, biochemistry, plant and animal identification, chemical analysis, ecological and microbiological techniques.",
     False),

    ("Bachelor of Science in Biological Sciences (ECP)", "W64012", "112304", 7, 360, "4", "Mthatha",
     "Faculty of Natural Sciences", 23,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 4, 50), ("Life Sciences", 4, 50)],
     "Extended Curriculum Programme version of Bachelor of Science in Biological Sciences.",
     False),

    ("Bachelor of Science in Chemistry", "W64013", "116397", 7, 360, "3", "Mthatha",
     "Faculty of Natural Sciences", 25,
     [("English HL or FAL", 4, 50), ("Mathematics", 5, 60), ("Physical Sciences", 5, 60)],
     "Produces graduates with solid foundations in all branches of Chemistry. Includes additional Mathematics courses up to level two for understanding Physical Science phenomena.",
     False),

    ("Bachelor of Science in Chemistry (ECP)", "W64014", "116397", 7, 360, "4", "Mthatha",
     "Faculty of Natural Sciences", 23,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 4, 50)],
     "Extended Curriculum Programme version of Bachelor of Science in Chemistry.",
     False),

    ("Bachelor of Science in Computer Science", "W64015", "112446", 7, 360, "3", "Mthatha",
     "Faculty of Natural Sciences", 25,
     [("English HL or FAL", 4, 50), ("Mathematics", 5, 60), ("Physical Sciences", 4, 50)],
     "Equips students with knowledge and skills to become computer scientists. Graduates in demand locally, nationally, and internationally in scientific, business, and computing industries.",
     False),

    ("Bachelor of Science in Computer Science (ECP)", "W64016", "112446", 7, 360, "4", "Mthatha",
     "Faculty of Natural Sciences", 23,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 3, 40)],
     "Extended Curriculum Programme version of Bachelor of Science in Computer Science.",
     False),

    ("Bachelor of Science in Environmental Studies", "W64017", "116190", 7, 360, "3", "Mthatha",
     "Faculty of Natural Sciences", 25,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 4, 50), ("Life Sciences/Agriculture/Tourism", 4, 50)],
     "Provides detailed knowledge of Environmental Impact Assessment, Resources and Environmental Law. Graduates identify and solve environmental problems and understand tourism factors.",
     False),

    ("Bachelor of Science in Environmental Studies (ECP)", "W64018", "116190", 7, 360, "4", "Mthatha",
     "Faculty of Natural Sciences", 23,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 4, 50), ("Life Sciences", 4, 50)],
     "Extended Curriculum Programme version of Bachelor of Science in Environmental Studies.",
     False),

    ("Bachelor of Science in Mathematics", "W64019", "101253", 7, 360, "3", "Mthatha",
     "Faculty of Natural Sciences", 25,
     [("English HL or FAL", 4, 50), ("Mathematics", 5, 60), ("Physical Sciences", 4, 50)],
     "Provides mathematical knowledge for jobs requiring mathematical maturity and for further training in Mathematics specialisations.",
     False),

    ("Bachelor of Science in Mathematics (ECP)", "W64020", "101253", 7, 360, "4", "Mthatha",
     "Faculty of Natural Sciences", 23,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 3, 40)],
     "Extended Curriculum Programme version of Bachelor of Science in Mathematics.",
     False),

    ("Bachelor of Science in Pest Management", "W64021", "112432", 7, 360, "3", "Mthatha",
     "Faculty of Natural Sciences", 25,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 4, 50), ("Life Sciences", 4, 50)],
     "Provides understanding for initiating, planning and implementing adaptive pest control programmes. Graduates can manipulate technical equipment, capture field data, write technical reports.",
     False),

    ("Bachelor of Science in Pest Management (ECP)", "W64022", "112432", 7, 360, "4", "Mthatha",
     "Faculty of Natural Sciences", 23,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 3, 40), ("Life Sciences", 3, 40)],
     "Extended Curriculum Programme version of Bachelor of Science in Pest Management.",
     False),

    ("Bachelor of Science in Physics", "W64023", "112445", 7, 360, "3", "Mthatha",
     "Faculty of Natural Sciences", 25,
     [("English HL or FAL", 4, 50), ("Mathematics", 5, 60), ("Physical Sciences", 5, 60)],
     "Focuses on fundamental principles governing the natural world: mechanics, electromagnetism, quantum mechanics, thermodynamics. Strong analytical and problem-solving skills through laboratory work and theory.",
     False),

    ("Bachelor of Science in Physics (ECP)", "W64024", "112445", 7, 360, "4", "Mthatha",
     "Faculty of Natural Sciences", 23,
     [("English HL or FAL", 4, 50), ("Mathematics", 4, 50), ("Physical Sciences", 4, 50)],
     "Extended Curriculum Programme version of Bachelor of Science in Physics.",
     False),
]

# Build programmes list
programmes = []
for prog in PROGRAMMES_RAW:
    (name, code, saqa, nqf, credits, duration, campus, faculty, aps, subjects, overview, selection) = prog

    # Determine qualification type
    if name.startswith("Bachelor"):
        qual_type = "Degree"
    elif name.startswith("Diploma") or name.startswith("Higher Certificate"):
        qual_type = "Diploma" if "Diploma" in name else "Higher Certificate"
    else:
        qual_type = "Degree"

    # NQF level string
    nqf_str = f"NQF {nqf}"

    # Build subjects_compulsory
    subjects_compulsory = []
    for subj_name, nsc_level, pct in subjects:
        subjects_compulsory.append({
            "subject": subj_name,
            "minimum_nsc_level": nsc_level,
            "minimum_percentage": pct,
            "notes": f"{nsc_level} ({pct}-{'49' if pct==40 else '59' if pct==50 else '69' if pct==60 else '79' if pct==70 else '89' if pct==80 else '99'}%)"
        })

    p = {
        "name": name,
        "normalized_name": name.replace("(ECP)", "Extended Curriculum Programme").strip(),
        "qualification_type": qual_type,
        "qualification_level": nqf_str,
        "faculty_name": faculty,
        "department": None,
        "campus": campus,
        "duration": f"{duration} year{'s' if duration != '1' else ''}",
        "study_mode": "Full-time",
        "programme_code": code,
        "saqa_code": saqa,
        "nqf_level": nqf,
        "min_aps": aps,
        "min_aps_name": "WSU APS",
        "subjects_compulsory": subjects_compulsory,
        "subject_or_groups": None,
        "minimum_grade_requirement": None,
        "selection_required": selection,
        "programme_overview": overview[:500] if overview else None,
        "career_outcomes": [],
        "fees_per_year": None,
        "institution_id": "378",
        "institution_name": "Walter Sisulu University",
        "source_file": "prospectuses/walter-sisulu-university-of-technology-and-science.pdf",
        "source_excerpt": f"{code} {name} | APS: {aps} | Campus: {campus}",
        "extraction_confidence": 0.92
    }
    programmes.append(p)

WSU_DATA["programmes"] = programmes

# Validate
print(f"Total programmes: {len(programmes)}")
print(f"Faculties: {len(WSU_DATA['faculties'])}")
print(f"Admission rules: {len(WSU_DATA['admission_requirements'])}")

# Save
with open("./wsu_output.json", "w") as f:
    json.dump(WSU_DATA, f, indent=2, ensure_ascii=False)
print("Saved to ./wsu_output.json")
print(f"File size: {len(json.dumps(WSU_DATA))} chars")
PYEOF
Output

Total programmes: 91
Faculties: 7
Admission rules: 4
Saved to ./wsu_output.json
File size: 134570 chars
