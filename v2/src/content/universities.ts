export interface UniversityPage {
  slug: string; shortName: string; title: string; description: string; heading: string; lead: string;
  defaultTarget: string; presets: string[]; targetHelp: string; sectionTitle: string;
  sections: { heading: string; text: string }[];
  source: { label: string; url: string };
}

// Presets are planning aids, never a blanket statement of current exam eligibility.
// Keep source scope/date in the visible copy when changing a university's settings.
export const universities: UniversityPage[] = [
  {
    slug: 'vtu', shortName: 'VTU', title: 'VTU Attendance Calculator — 85% Target & Recovery | BunkMeter',
    description: 'Plan VTU attendance with an editable 85% target. Calculate consecutive classes to attend or miss, and check recovery against your remaining lectures.',
    heading: 'VTU attendance calculator.',
    lead: 'Start with an 85% planning target, enter your recorded lectures and see your next move. Check the scheme and course rules that apply to you.',
    defaultTarget: '85', presets: ['85', '90', '95'],
    targetHelp: '85% comes from VTU’s 2022 B.E./B.Tech. regulations. Confirm your scheme and course; you can edit this target.',
    sectionTitle: 'Plan attendance for your VTU course',
    sections: [
      { heading: 'Match your scheme before using a preset', text: 'VTU’s published 2022 B.E./B.Tech. regulations specify an 85% attendance minimum for each registered course. This preset reflects that document, not every programme or later amendment. Check your college’s current notice and your applicable regulation before planning.' },
      { heading: 'Check each course separately', text: 'Use the counts recorded for the course you are checking. At 85 attended out of 100 held, you are exactly at an 85% target and cannot miss the next class while remaining at that target. At 80 out of 100, attending the next 34 classes gives 114 out of 134 and clears 85%.' },
      { heading: 'Keep condonation separate from the calculation', text: 'A shortage concession is an institutional decision with conditions; it is not automatically added to your attended count. Enter only adjustments your college has actually recognised. If the semester is ending, add remaining lectures to see whether recovery is mathematically possible.' },
    ],
    source: { label: 'VTU 2022 B.E./B.Tech. regulations, attendance section 220B 3.7 (PDF)', url: 'https://vtu.ac.in/wp-content/uploads/2023/05/Regulations-Clr-BE-BTECH-2022-611-02052023.pdf' },
  },
  {
    slug: 'aktu', shortName: 'AKTU', title: 'AKTU Attendance Calculator — 75% Target & Recovery | BunkMeter',
    description: 'Use an editable 75% planning target for AKTU attendance. Work out classes to attend or miss and test whether your remaining semester can reach the target.',
    heading: 'AKTU attendance calculator.',
    lead: 'Use a 75% planning target, or enter the requirement confirmed by your college. Calculate from held and attended lectures, not calendar days.',
    defaultTarget: '75', presets: ['75', '80', '85'],
    targetHelp: '75% is a planning preset. Confirm the current requirement and aggregation method with your AKTU-affiliated college.',
    sectionTitle: 'Use your college’s attendance record',
    sections: [
      { heading: 'Confirm how your college combines attendance', text: 'MIET’s 2022–23 academic plan cites AKTU B.Tech. attendance norms and a 75% aggregate minimum. We use 75% as an editable starting point, not a current eligibility ruling for every AKTU programme. Ask your college which lectures and practicals belong in the total for your course.' },
      { heading: 'Recovering from 72% to 75%', text: 'With 72 attended out of 100 held, attending 12 consecutive classes gives 84 out of 112: exactly 75%. Adding only three attended classes would give 75 out of 103, which is still below the target. Every new class changes the denominator too.' },
      { heading: 'Use the remaining-class estimate carefully', text: 'If only 10 classes remain in that example, even full attendance gives 82 out of 110, below 75%. The calculator reports the mathematical limit; it cannot approve leave, condonation or an examination form. Recheck the estimate when your timetable changes.' },
    ],
    source: { label: 'MIET academic plan 2022–23, attendance and marks (PDF)', url: 'https://miet.ac.in/media_image/notice/2024_02_08_03_35_59_4503.pdf' },
  },
  {
    slug: 'du', shortName: 'DU', title: 'DU Attendance Calculator — Custom Targets & Planning | BunkMeter',
    description: 'Plan Delhi University attendance with editable targets. Understand the difference between a 67% planning buffer and an exact two-thirds requirement.',
    heading: 'DU attendance calculator.',
    lead: 'Start with a 67% planning buffer or enter your course’s percentage. 67% is not exactly two thirds; confirm how your college applies its attendance rules.',
    defaultTarget: '67', presets: ['67', '75', '85'],
    targetHelp: '67% is a conservative planning buffer, not exact two thirds. This calculator accepts percentages to two decimal places.',
    sectionTitle: 'Understand the two-thirds boundary',
    sections: [
      { heading: 'Two thirds is a fraction, not 66.67%', text: 'Shaheed Bhagat Singh College’s attendance guidance cites a two-thirds requirement under DU Ordinance VII. Two thirds repeats as 66.666…%. This calculator’s 67% starting target is deliberately a slightly higher planning buffer, not an exact implementation of that fraction or a guarantee of eligibility.' },
      { heading: 'Why that distinction changes a result', text: 'Attending 2 out of 3 classes is exactly two thirds. It is below both 66.67% and 67%, so a decimal-target calculator will show a shortage at either target. For an exact two-thirds requirement with equally counted classes, compare 3 × attended with 2 × held directly; do not round the percentage first.' },
      { heading: 'Check the applicable attendance grouping', text: 'Use the lectures, tutorials and practicals that your college tells you to include. Do not average subject percentages with different numbers of classes. Your programme’s rules, approved adjustments and the relevant period determine the official result; BunkMeter provides a plan from the numbers and percentage you choose.' },
    ],
    source: { label: 'Shaheed Bhagat Singh College, University of Delhi: attendance guidelines', url: 'https://sbs.du.ac.in/attendance-guidelines/' },
  },
];
