/**
 * Seed Blockchain Basics (Stellar) and Soroban Crash Course from GitHub repos.
 * Usage: npx tsx src/scripts/seedBlockchainSorobanCourses.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { db, close } from '../config/database.js';
import type { Course } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const BASE_BLOCKCHAIN = 'https://raw.githubusercontent.com/smwebsystems/blockchain-basics-stellar-blockchain-basics/main';
const BASE_SOROBAN = 'https://raw.githubusercontent.com/smwebsystems/soroban-crash-course/main';

const COURSES: Course[] = [
  {
    id: uuidv4(),
    title: 'Blockchain Basics and Stellar Blockchain Basics',
    description: 'Prerequisite module for Stellar smart contract development. Covers blockchain fundamentals, Stellar Consensus Protocol (SCP), and the Stellar stack. Do not skip—essential before Rust and Soroban.',
    courseCode: 'BLOCKCHAIN-STELLAR-101',
    sections: [
      {
        id: uuidv4(),
        title: 'Week 1 - Blockchain & Stellar Fundamentals',
        objective: 'Build a strong mental model of blockchain, consensus, and the Stellar ecosystem.',
        outcome: 'You can explain how blockchains work, how Stellar reaches consensus, and the main components of the Stellar stack.',
        items: [
          {
            id: uuidv4(),
            type: 'link',
            title: 'Week 1 – Full module (read in order)',
            order: 1,
            url: `${BASE_BLOCKCHAIN}/Blockchain_Basics_Week_1.md`,
          },
          {
            id: uuidv4(),
            type: 'link',
            title: 'Day 1 – Introduction to Blockchain (YouTube playlist)',
            order: 2,
            url: 'https://www.youtube.com/playlist?list=PL6x19QC2pW49lvxs3yjgeOjvfhQ0aXeMv',
          },
          {
            id: uuidv4(),
            type: 'link',
            title: 'Day 2 – Stellar Consensus Protocol (YouTube playlist)',
            order: 3,
            url: 'https://www.youtube.com/playlist?list=PL6x19QC2pW4-alt80HwjXcdPE0F4HLkHy',
          },
          {
            id: uuidv4(),
            type: 'link',
            title: 'Day 3 – Stellar Stack (YouTube playlist)',
            order: 4,
            url: 'https://www.youtube.com/playlist?list=PL6x19QC2pW4-MKNSFs5i5AZUDV8E4Tv-W',
          },
        ],
      },
    ],
  },
  {
    id: uuidv4(),
    title: 'Soroban Crash Course',
    description: 'Soroban smart contract development on Stellar. From intro to smart contracts through Guest Book, Task Manager, Mini Escrow, and NFT contracts. By SM Web Systems.',
    courseCode: 'SOROBAN-101',
    sections: [
      {
        id: uuidv4(),
        title: 'Day 1 – Smart Contract Intro',
        objective: 'Strong conceptual and technical understanding of smart contracts on Stellar with Soroban.',
        outcome: 'You can confidently design, deploy, and interact with Soroban smart contracts.',
        items: [
          { id: uuidv4(), type: 'link', title: 'Day 1 – Smart Contract Intro (full guide)', order: 1, url: `${BASE_SOROBAN}/Day_1_Smart_Contract_Intro.md` },
        ],
      },
      {
        id: uuidv4(),
        title: 'Day 2 – Getting Started With Soroban',
        objective: 'Set up your environment and run your first Soroban contract.',
        outcome: 'You have a working Soroban dev environment and have deployed a simple contract.',
        items: [
          { id: uuidv4(), type: 'link', title: 'Day 2 – Getting Started With Soroban', order: 1, url: `${BASE_SOROBAN}/Day_2_Getting_Started_With_Soroban.md` },
        ],
      },
      {
        id: uuidv4(),
        title: 'Day 3 – Guest Book Smart Contract',
        objective: 'Build a guest book contract to learn storage and basic patterns.',
        outcome: 'You can write a contract that persists and retrieves data.',
        items: [
          { id: uuidv4(), type: 'link', title: 'Day 3 – Guest Book Smart Contract', order: 1, url: `${BASE_SOROBAN}/Day_3_Guest_Book_Smart_Contract.md` },
        ],
      },
      {
        id: uuidv4(),
        title: 'Day 4 – Task Manager Smart Contract',
        objective: 'Implement a task manager contract with CRUD-style operations.',
        outcome: 'You can build a contract that manages a list of items.',
        items: [
          { id: uuidv4(), type: 'link', title: 'Day 4 – Task Manager Smart Contract', order: 1, url: `${BASE_SOROBAN}/Day_4_Task_Manager_SC.md` },
        ],
      },
      {
        id: uuidv4(),
        title: 'Day 5 – Mini Escrow Smart Contract',
        objective: 'Build a simple escrow contract for conditional payments.',
        outcome: 'You understand escrow patterns and multi-party flows in Soroban.',
        items: [
          { id: uuidv4(), type: 'link', title: 'Day 5 – Mini Escrow Smart Contract', order: 1, url: `${BASE_SOROBAN}/Day_5_MiniEscrow_Smart_Contract.md` },
        ],
      },
      {
        id: uuidv4(),
        title: 'Day 6 – NFT',
        objective: 'Create and interact with NFT (non-fungible token) contracts on Soroban.',
        outcome: 'You can deploy and use a basic NFT contract.',
        items: [
          { id: uuidv4(), type: 'link', title: 'Day 6 – NFT', order: 1, url: `${BASE_SOROBAN}/Day_6_NFT.md` },
        ],
      },
    ],
  },
];

function seed() {
  try {
    const insert = db.prepare(
      'INSERT INTO courses (id, title, description, course_code, sections) VALUES (?, ?, ?, ?, ?)'
    );
    const update = db.prepare(
      'UPDATE courses SET title = ?, description = ?, sections = ? WHERE course_code = ?'
    );
    const existing = db.prepare('SELECT id FROM courses WHERE course_code = ?');

    for (const course of COURSES) {
      const row = existing.get(course.courseCode) as { id: string } | undefined;
      if (row) {
        update.run(
          course.title,
          course.description ?? null,
          JSON.stringify(course.sections),
          course.courseCode
        );
        console.log('Updated course:', course.title, `(${course.courseCode})`);
      } else {
        insert.run(
          course.id,
          course.title,
          course.description ?? null,
          course.courseCode,
          JSON.stringify(course.sections)
        );
        console.log('Created course:', course.title, `(${course.courseCode})`);
      }
    }
    console.log('Done. Courses:', COURSES.length);
  } catch (err) {
    console.error('Error seeding courses:', err);
    process.exit(1);
  } finally {
    close();
  }
}

seed();
