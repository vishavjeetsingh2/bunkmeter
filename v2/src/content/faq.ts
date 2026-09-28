export const attendanceFaq = [
  { question: 'What does “can miss” mean?', answer: 'It is the number of consecutive future classes you can miss while staying at or above your target. Each missed class increases classes held, but not classes attended. If you enter remaining classes, this allowance cannot exceed them.' },
  { question: 'How does recovery work?', answer: 'Each class you attend increases both counts. We find the smallest consecutive run that reaches your target. At 60 attended out of 100 held, a 75% target needs 60 more attended classes: 120 out of 160.' },
  { question: 'What if my semester is nearly over?', answer: 'Add the lectures remaining to check your best possible finish. A term-end allowance assumes you attend the other remaining classes; it is different from how many you can miss consecutively right now.' },
  { id: 'condonation', question: 'Do approved absences count?', answer: 'That depends on your institution. Calendar days and lectures are not interchangeable. Use the attended and held counts your institution recognizes; BunkMeter cannot approve leave or determine condonation eligibility.' },
];
export const faqSchema = {
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: attendanceFaq.map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
};
