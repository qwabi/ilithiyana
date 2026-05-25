# Meeting Summary

## Current website and application flow

- The current website is mainly informational and does not yet accept applications directly, so parents are sent a PDF application form instead. Parents either print and fill it out or complete it digitally, then send it back with payment details. [08:50]
- The manual application process creates extra admin work because the information from returned forms is scanned or emailed, then manually entered into Excel and filtered by the team. [11:13]
- A key goal is to move the application process onto the website so that parent, learner, school, location, grade, and other details are captured directly and stored safely in a system instead of being retyped. [11:13] [23:16]

## Payments and subscription handling

- The current model is package-based, with parents paying for lesson bundles rather than a true subscription; parents must be reminded manually when a new payment cycle starts. [09:39] [10:22]
- There was discussion of adding recurring billing, but the parent may not always want to pay every month, especially during holidays, so flexibility is important. [10:22] [12:23]
- Two payment approaches were discussed: PayFast for recurring billing and a reminder-based flow using Yoco plus notifications. It was clarified that the current setup relies more on EFT than card payments, so PayFast or another EFT-friendly gateway is needed. [12:44] [14:25] [14:59]
- A lower-cost reminder strategy was preferred for now: payment reminders can be sent manually, or later automated by email, WhatsApp, or SMS. Email was identified as the most practical and cheapest option. [16:00] [16:27] [17:08]

## Parent reminders and communication

- WhatsApp reminders were considered, but the cost and need for a Twilio subscription made it less attractive for the current scale of the business. [15:28]
- The preferred short-term approach is to send payment reminder messages manually via WhatsApp because the number of parents is still relatively small. [16:00]
- Email reminders were highlighted as a free or low-cost option, with a service that can handle up to a high monthly volume, which is more than enough for the current needs. [16:27]

## Database, CRM, and data management

- A major pain point is the need to capture application data once and keep it in a structured database, instead of repeatedly copying it into spreadsheets. [11:43] [17:31]
- The proposed solution is to build a database-backed system where applicants become users, their data is stored centrally, and both parents and administrators can view relevant information after logging in. [18:17]
- The system should include separate pages for children, parents, subscriptions, and applications, with clear statuses such as paid, pending, or confirmed. Exporting to Excel or PDF should also be possible. [19:03] [19:40] [20:09]
- The purpose of this is not just administration, but also long-term CRM-style relationship management and remarketing to families later if needed. [18:17]

## Scheduling classes and virtual delivery

- Classes are currently scheduled using Google Meet and Google Calendar, with recurring events created manually each week and links copied into the virtual classroom area. This process is time-consuming. [24:18] [24:58]
- The long-term vision is for students to log into the platform and see their schedule, the classes they need to attend, the tutor responsible, and ideally a join link that appears when it is time for class. [38:51] [39:14]
- The current workflow uses Google Meet notifications and the host receives alerts when a class is about to start, then manually checks whether the session happened. [39:42] [40:25]

## Application criteria, allocation, and learner grouping

- Applications are always open, with no fixed closing date, and are submitted continuously throughout the term. [25:33] [25:52]
- When applications are received, the learner is allocated mainly by grade, level, and subject choice. Grade and level are the main factors used to place learners quickly into the right classes. [26:16] [26:49]
- The business groups learners into very small classes, usually a tutor-to-learner ratio of 1:3, and sometimes fewer depending on demand. [21:10] [21:50]
- Learners are also grouped by subject and level, and the platform should eventually automate this allocation from the application form instead of doing it manually. [26:49] [27:39] [23:16]
- The application form includes parental details, learner details, school name, grade, subjects, package selection, and supporting documents such as the latest academic report and proof of payment. [49:11] [49:49]
- The business rejects some applications when the requested subject is not offered, such as accounting or geography, since the service only covers selected subjects. [54:43] [55:29]

## Packages, pricing, and revenue model

- Two packages were discussed: Package A as the recommended full package, and Package B as an exam-prep-oriented option. [56:30]
- Package A was described as a monthly plan that includes eight lessons and some additional career guidance sessions. Package B is a lighter plan, paid per lesson or structured differently for exam preparation. [56:30] [57:58]
- Pricing is currently flat across subjects and levels, though this may change in future as the business expands into different school phases. [59:14] [59:43]
- The tutor rate is also flat per session, with tutors paid hourly/session-based rather than per learner. [01:00:03]

## Tutor management and payroll

- Tutors currently submit monthly timesheets or log sheets covering the period from the 26th of one month to the 25th of the next. Each class is logged and multiplied by the agreed session rate. [32:23] [33:57]
- These sheets are treated like invoices, and the calculated amount is what tutors get paid at month end. [35:21] [36:02]
- The business wants to automate tutor submission and approval so that the system can collect session data, send it to the admin for review, and allow approve/reject workflows with resubmission if needed. [43:28] [43:59]
- There is interest in integrating this workflow with SMEasy so that once payments or session data are approved, it can feed into finance and accounting records automatically. [01:01:27] [01:02:00]

## User roles and system access

- The intended user roles are parents, learners, tutors, and the admin team. [38:39] [38:52]
- Tutors are currently using their own Gmail accounts, but the business wants them to have organization-managed accounts for better control and security. [41:27] [42:10]
- The admin wants central visibility over finance, subscriptions, parents, and learners from one console, instead of managing everything through scattered tools. [42:10] [42:52]

## Documents and onboarding

- Parents are generally required to submit only the application form, the learner’s school report, and proof of payment; no ID copy is needed. [44:24] [44:55]
- The application form captures the parent/guardian name, contact number, email, learner age, school name, current grade, subjects, package choice, and other required details. [49:11] [49:49]
- The team also runs a short onboarding session of about 30 minutes to help parents understand how the online learning process works and how to access class links. [50:49] [51:39]

## Reporting and progress tracking

- Tutors are expected to produce term reports summarizing learner performance, progress, strengths, and weaker areas. [52:49] [53:17]
- The business does not use formal exams; instead, it assesses learners by performance and subject-level progress. [53:46]

## Marketing and growth

- A major business concern is marketing and getting the service in front of more people, since the concept has already been proven and the main challenge is awareness. [01:06:33] [01:07:08]
- A suggested growth strategy was to earn backlinks and credibility from schools, universities, and education-sector websites by having them write about the service and link to the site. [01:14:37] [01:16:24]
- The discussion ended with a plan for ongoing collaboration rather than a one-off build, so the product and marketing foundation can be improved over time. [01:07:34] [01:08:51]
