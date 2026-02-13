/**
 * Seed 2 dummy courses for SM Web Systems LMS.
 * Usage: npm run db:seed-courses
 */

import dotenv from 'dotenv';
dotenv.config();

import { db, close } from '../config/database.js';
import type { Course } from '../types/index.js';

const ID = (s: string) => s;

const DUMMY_COURSES: Course[] = [
  {
    id: ID('course-blockchain-basics'),
    title: 'Blockchain Basics (Week 1)',
    description: 'Prerequisite module: core concepts and terminology.',
    sections: [
      {
        id: ID('sec-bc-day1'),
        title: 'Day 1 - Introduction',
        objective: 'Build a strong mental model of what a blockchain is.',
        outcome: 'You should understand blocks, hashes, and chains.',
        items: [
          {
            id: ID('item-bc-v1'),
            type: 'video',
            title: 'Part 1: What is a blockchain?',
            order: 1,
            url: 'https://www.youtube.com/embed/SSo_EIwHSd4',
          },
          {
            id: ID('item-bc-link1'),
            type: 'link',
            title: 'Slides (Day 1)',
            order: 2,
            url: 'https://example.com/slides-day1',
          },
        ],
      },
      {
        id: ID('sec-bc-day2'),
        title: 'Day 2 - Consensus',
        objective: 'Understand how nodes agree on the next block.',
        outcome: 'You should be able to explain proof-of-work and proof-of-stake.',
        items: [
          {
            id: ID('item-bc-v2'),
            type: 'video',
            title: 'Consensus mechanisms',
            order: 1,
            url: 'https://www.youtube.com/embed/UmhvJVn2b_s',
          },
          {
            id: ID('item-bc-link2'),
            type: 'link',
            title: 'Further reading',
            order: 2,
            url: 'https://ethereum.org/en/developers/docs/consensus-mechanisms/',
          },
        ],
      },
    ],
  },
  {
    id: ID('course-solidity'),
    title: 'Smart Contracts & Solidity',
    description: 'Write and deploy simple smart contracts.',
    sections: [
      {
        id: ID('sec-sol-fund'),
        title: 'Solidity fundamentals',
        objective: 'Learn syntax, types, and basic patterns.',
        outcome: 'You can write a simple contract and compile it.',
        items: [
          {
            id: ID('item-sol-v1'),
            type: 'video',
            title: 'Solidity in 15 minutes',
            order: 1,
            url: 'https://www.youtube.com/embed/5bqQ5FQaRog',
          },
          {
            id: ID('item-sol-link'),
            type: 'link',
            title: 'Solidity docs',
            order: 2,
            url: 'https://docs.soliditylang.org/',
          },
        ],
      },
      {
        id: ID('sec-sol-deploy'),
        title: 'Deploying contracts',
        objective: 'Use Remix or Hardhat to deploy to a testnet.',
        outcome: 'You have deployed at least one contract.',
        items: [
          {
            id: ID('item-sol-v2'),
            type: 'video',
            title: 'Remix walkthrough',
            order: 1,
            url: 'https://www.youtube.com/embed/5bqQ5FQaRog',
          },
          {
            id: ID('item-sol-pdf'),
            type: 'pdf',
            title: 'Lab handout (PDF)',
            order: 2,
          },
        ],
      },
    ],
  },
];

function seed() {
  try {
    const insert = db.prepare(
      'INSERT OR IGNORE INTO courses (id, title, description, sections) VALUES (?, ?, ?, ?)'
    );
    for (const course of DUMMY_COURSES) {
      const result = insert.run(
        course.id,
        course.title,
        course.description ?? null,
        JSON.stringify(course.sections)
      );
      if (result.changes > 0) {
        console.log('Created course:', course.title);
      } else {
        console.log('Skipped (id exists):', course.title);
      }
    }
    console.log('Seeded', DUMMY_COURSES.length, 'dummy courses.');
  } catch (err) {
    console.error('Error seeding courses:', err);
    process.exit(1);
  } finally {
    close();
  }
}

seed();
