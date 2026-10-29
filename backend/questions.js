
"use strict";

const QUESTIONS = [
  {
    id: "Q1",
    level: "easy",
    title: "Power Check",
    story:
      "The Chrono-Core's power supply is being tested. Both power switches must be ON for the system to activate.",
    connect: [
      "Connect Power Switch A and Power Switch B to the two inputs of an AND gate."
    ],
    expect: ["and", "Power A", "Power B"],
    out: "Core output",
    t: {
      cols: ["Power A", "Power B"],
      rows: [[0, 0], [0, 1], [1, 0], [1, 1]]
    },
    correctCode: "0001",
    hint: "The output is 1 only when every input is ON."
  },
  {
    id: "Q2",
    level: "easy",
    title: "Emergency Beacon",
    story: "The emergency beacon can be activated by either backup system.",
    connect: [
      "Connect Backup Navigation and Backup Shield to the two inputs of an OR gate."
    ],
    expect: ["or", "Navigation", "Shield"],
    out: "Core output",
    t: {
      cols: ["Navigation", "Shield"],
      rows: [[0, 0], [0, 1], [1, 0], [1, 1]]
    },
    correctCode: "0111",
    hint: "The output is 1 when at least one input is ON."
  },
  {
    id: "Q3",
    level: "easy",
    title: "Override Reversal",
    story:
      "The Core must reverse the Emergency Override signal. When Override is OFF, the reversed signal should be ON.",
    connect: ["Connect Emergency Override to a NOT gate."],
    expect: ["not", "Emergency Override"],
    out: "Core output",
    t: {
      cols: ["Emergency Override"],
      rows: [[0], [1]]
    },
    correctCode: "10",
    note: "This question has two test rows, so the code has two digits.",
    hint: "The output is always the opposite of the input."
  },
  {
    id: "Q4",
    level: "easy",
    title: "Safety Chamber",
    story:
      "The time-travel chamber activates only when both safety switches are ON.",
    connect: [
      "Connect Power Safety and Navigation Safety to an AND gate."
    ],
    expect: ["and", "Power Safety", "Navigation Safety"],
    out: "Core output",
    t: {
      cols: ["Power Safety", "Navigation Safety"],
      rows: [[0, 0], [0, 1], [1, 0], [1, 1]]
    },
    correctCode: "0001",
    hint: "Both safety switches must be ON."
  },
  {
    id: "Q5",
    level: "medium",
    title: "Disable the Override",
    story:
      "The Core requires Main Power ON and Emergency Override OFF.",
    connect: [
      "Connect Emergency Override to a NOT gate.",
      "Connect Main Power and the NOT output to an AND gate."
    ],
    expect: ["and", "Power", ["not", "Override"]],
    out: "Core output",
    t: {
      cols: ["Power", "Override"],
      rows: [[0, 0], [0, 1], [1, 0], [1, 1]]
    },
    correctCode: "0010",
    hint: "Power must be ON while Override is OFF."
  },
  {
    id: "Q6",
    level: "medium",
    title: "Restore Navigation",
    story:
      "Navigation can be restored through either backup system, but Main Power must also be ON.",
    connect: [
      "Connect Backup Navigation and Backup Shield to an OR gate.",
      "Connect the OR output and Main Power to an AND gate."
    ],
    expect: ["and", ["or", "Navigation", "Shield"], "Power"],
    out: "Core output",
    t: {
      cols: ["Navigation", "Shield", "Power"],
      rows: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]]
    },
    correctCode: "0111",
    hint: "At least one backup and Main Power must be ON."
  },
  {
    id: "Q7",
    level: "medium",
    title: "Chrono-Core Conditions",
    story:
      "The Core activates only when Power is ON, Navigation or Shield is ON, and Emergency Override is OFF.",
    connect: [
      "Connect Navigation and Shield to an OR gate.",
      "Connect Emergency Override to a NOT gate.",
      "Connect Power, the OR output, and the NOT output to an AND gate."
    ],
    expect: [
      "and",
      "Power",
      ["or", "Navigation", "Shield"],
      ["not", "Override"]
    ],
    out: "Core output",
    t: {
      cols: ["Power", "Navigation", "Shield", "Override"],
      rows: [
        [0, 0, 0, 0],
        [1, 0, 1, 0],
        [1, 1, 0, 0],
        [1, 1, 1, 1]
      ]
    },
    correctCode: "0110",
    hint: "All three conditions must hold in the same row."
  },
  {
    id: "Q8",
    level: "medium",
    title: "Backup Logic Repair",
    story:
      "The backup circuit must activate when Navigation or Shield is ON, but remain OFF when both are OFF.",
    connect: ["Connect Navigation and Shield to an OR gate."],
    expect: ["or", "Navigation", "Shield"],
    out: "Core output",
    t: {
      cols: ["Navigation", "Shield"],
      rows: [[0, 0], [0, 1], [1, 0], [1, 1]]
    },
    correctCode: "0111",
    hint: "At least one input must be ON."
  },
  {
    id: "Q9",
    level: "hard",
    title: "Reconstruct the Temporal Lock",
    story:
      "Main Power must be ON, Navigation or Shield must be ON, and Emergency Override must be OFF.",
    connect: [
      "Connect Navigation and Shield to an OR gate.",
      "Connect Emergency Override to a NOT gate.",
      "Connect Power, the OR output, and the NOT output to a final AND gate."
    ],
    expect: [
      "and",
      "Power",
      ["or", "Navigation", "Shield"],
      ["not", "Override"]
    ],
    out: "Core output",
    t: {
      cols: ["Power", "Navigation", "Shield", "Override"],
      rows: [
        [0, 0, 0, 0],
        [1, 1, 0, 0],
        [1, 0, 1, 1],
        [1, 1, 1, 0]
      ]
    },
    correctCode: "0101",
    hint: "Check Power, the backup systems, and Override in every row."
  },
  {
    id: "Q10",
    level: "hard",
    title: "Final Chrono-Core Activation",
    story:
      "Power must be ON, at least one of Navigation or Shield must be ON, and Emergency Override must be OFF.",
    connect: [
      "Build Navigation OR Shield.",
      "Invert Emergency Override using NOT.",
      "AND Power, the backup OR result, and the inverted Override."
    ],
    expect: [
      "and",
      "Power",
      ["or", "Navigation", "Shield"],
      ["not", "Override"]
    ],
    out: "Core output",
    t: {
      cols: ["Power", "Navigation", "Shield", "Override"],
      rows: [
        [0, 1, 1, 0],
        [1, 0, 0, 0],
        [1, 1, 0, 0],
        [1, 0, 1, 0],
        [1, 1, 1, 1]
      ]
    },
    correctCode: "00110",
    note: "This question has five test rows, so the code has five digits.",
    hint: "Read all five rows carefully. Every required condition must hold."
  }
];

function publicQuestion(q) {
  const { correctCode, expect, ...safeQuestion } = q;
  return safeQuestion;
}

module.exports = { QUESTIONS, publicQuestion };
