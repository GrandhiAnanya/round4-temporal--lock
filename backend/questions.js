"use strict";

const QUESTIONS = [
  {
    id: "Q1",
    level: "easy",
    title: "Power Check",
    story: "The Chrono-Core’s power supply is being tested. Both power switches must be ON for the system to activate.",
    connect: ["Connect Power Switch A and Power Switch B to an AND gate."],
    expect: ["and", "Power Switch A", "Power Switch B"],
    out: "Core output",
    t: { cols: ["Power Switch A", "Power Switch B"], rows: [[0,0],[0,1],[1,0],[1,1]] },
    correctCode: "0001",
    hint: "Both power inputs must be ON at the same time."
  },
  {
    id: "Q2",
    level: "easy",
    title: "Emergency Beacon",
    story: "The emergency beacon can be activated by either backup system.",
    connect: ["Connect Backup Navigation and Backup Shield to an OR gate."],
    expect: ["or", "Backup Navigation", "Backup Shield"],
    out: "OR output",
    t: { cols: ["Backup Navigation", "Backup Shield"], rows: [[0,0],[0,1],[1,0],[1,1]] },
    correctCode: "0111",
    hint: "At least one of the two backup inputs must be ON."
  },
  {
    id: "Q3",
    level: "easy",
    title: "Override Reversal",
    story: "The Core must reverse the Emergency Override signal. When Override is OFF, the reversed signal should be ON.",
    connect: ["Connect Emergency Override to a NOT gate."],
    expect: ["not", "Emergency Override"],
    out: "NOT output",
    t: { cols: ["Emergency Override"], rows: [[0],[1]] },
    correctCode: "10",
    hint: "A NOT gate produces the opposite value of its input."
  },
  {
    id: "Q4",
    level: "easy",
    title: "Safety Chamber",
    story: "The time-travel chamber activates only when both safety switches are ON.",
    connect: ["Connect Power Safety and Navigation Safety to an AND gate."],
    expect: ["and", "Power Safety", "Navigation Safety"],
    out: "AND output",
    t: { cols: ["Power Safety", "Navigation Safety"], rows: [[0,0],[0,1],[1,0],[1,1]] },
    correctCode: "0001",
    hint: "Only the row with both safety inputs ON should produce 1."
  },
  {
    id: "Q5",
    level: "medium",
    title: "Disable the Override",
    story: "The Core requires Main Power ON and Emergency Override single must be reversed.",
    connect: [
      "Connect Emergency Override to a NOT gate.",
      "Connect Main Power and the NOT output to an AND gate."
    ],
    expect: ["and", "Main Power", ["not", "Emergency Override"]],
    out: "Core output",
    t: { cols: ["Main Power", "Emergency Override"], rows: [[0,0],[0,1],[1,0],[1,1]] },
    correctCode: "0010",
    hint: "Power must be ON while Emergency Override must be OFF."
  },
  {
    id: "Q6",
    level: "medium",
    title: "Restore Navigation",
    story: "Navigation can be restored through either backup system, but Main Power must also be ON.",
    connect: [
      "Connect Backup Navigation and Backup Shield to an OR gate.",
      "Connect the OR output and Main Power to an AND gate."
    ],
    expect: ["and", ["or", "Backup Navigation", "Backup Shield"], "Main Power"],
    out: "Core output",
    t: { cols: ["Backup Navigation", "Backup Shield", "Main Power"], rows: [[0,0,0],[0,1,1],[1,0,1],[1,1,1]] },
    correctCode: "0111",
    hint: "At least one backup must be ON, and Power must also be ON."
  },
  {
    id: "Q7",
    level: "medium",
    title: "Chrono-Core Conditions",
    story: "The Core activates only when Power is ON, Navigation OR Shield is ON, and Emergency Override must be reversed.",
    connect: [
      "Connect Navigation and Shield to an OR gate.",
      "Connect Emergency Override to a NOT gate.",
      "Connect Power, the OR output, and the NOT output to an AND gate."
    ],
    expect: ["and", "Power", ["or", "Navigation", "Shield"], ["not", "Emergency Override"]],
    out: "Core output",
    t: { cols: ["Power", "Navigation", "Shield", "Emergency Override"], rows: [[0,0,0,0],[1,0,1,0],[1,1,0,0],[1,1,1,1]] },
    correctCode: "0110",
    hint: "All three conditions must hold in the same test row."
  },
  {
    id: "Q8",
    level: "medium",
    title: "Backup Logic Repair",
    story: "A damaged backup circuit must activate only when both Backup Navigation and Backup Shield are ON.",
    connect: ["Connect Backup Navigation and Backup Shield to an AND gate."],
    expect: ["and", "Backup Navigation", "Backup Shield"],
    out: "AND output",
    t: { cols: ["Backup Navigation", "Backup Shield"], rows: [[0,0],[0,1],[1,0],[1,1]] },
    correctCode: "0001",
    hint: "Both backup inputs must be ON at the same time."
  },
  {
    id: "Q9",
    level: "hard",
    title: "Reconstruct the Temporal Lock",
    story: "The original circuit has been erased. Mission Control recovered the conditions: Main Power must be ON; Navigation OR Shield must be ON; Emergency Override must be reversed.",
    connect: [
      "Connect Navigation and Shield to an OR gate.",
      "Connect Emergency Override to a NOT gate.",
      "Connect Main Power, the OR output, and the NOT output to a final AND gate."
    ],
    expect: ["and", "Main Power", ["or", "Navigation", "Shield"], ["not", "Emergency Override"]],
    out: "Core output",
    t: { cols: ["Main Power", "Navigation", "Shield", "Emergency Override"], rows: [[0,0,0,0],[1,1,0,0],[1,0,1,1],[1,1,1,0]] },
    correctCode: "0101",
    hint: "Check every test row against Main Power, the backup condition, and the reversed Emergency Override."
  },
  {
    id: "Q10",
    level: "hard",
    title: "Final Chrono-Core Activation",
    story: "The final Time Fragment is inside the Core. Build the activation circuit using the same recovered conditions: Power Switch A must be ON; at least one of Navigation or Shield ON; Emergency Override must be reversed.",
    connect: [
      "Build Navigation OR Shield.",
      "Invert Emergency Override using NOT.",
      "AND Power Switch A, the backup OR result, and the inverted Override."
    ],
    expect: ["and", "Power Switch A", ["or", "Navigation", "Shield"], ["not", "Emergency Override"]],
    out: "Core output",
    t: { cols: ["Power Switch A", "Navigation", "Shield", "Emergency Override"], rows: [[0,1,1,0],[1,0,0,0],[1,1,0,0],[1,0,1,0],[1,1,1,1]] },
    correctCode: "00110",
    hint: "Read every row carefully and check all three recovered conditions."
  }
];

function publicQuestion(q) {
  const { correctCode, expect, ...safeQuestion } = q;
  return safeQuestion;
}

module.exports = { QUESTIONS, publicQuestion };
