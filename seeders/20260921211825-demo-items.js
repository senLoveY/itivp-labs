'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Tweets', [
      {
        author: 'alex',
        content: 'Test new tweet!',
        hashtags: JSON.stringify(['#dev', '#web']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'jane_doe',
        content: 'Just deployed my first app to production. Feeling great!',
        hashtags: JSON.stringify(['#coding', '#success']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'js_ninja',
        content: 'Why does CSS always break when I center a div?',
        hashtags: JSON.stringify(['#css', '#frontend']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'devops_guy',
        content: 'Docker containers are an absolute lifesaver.',
        hashtags: JSON.stringify(['#docker', '#devops']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'ai_enthusiast',
        content: 'Machine learning is evolving so fast. Embracing the future!',
        hashtags: JSON.stringify(['#ai', '#ml']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'coffee_addict',
        content: 'Code is not compiling. Time for my 5th cup of coffee.',
        hashtags: JSON.stringify(['#coffee', '#developerlife']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'react_fan',
        content: 'Hooks completely changed the way I write React components.',
        hashtags: JSON.stringify(['#reactjs', '#javascript']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'vue_master',
        content: 'The Composition API is so clean and elegant.',
        hashtags: JSON.stringify(['#vuejs', '#frontend']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'node_hacker',
        content: 'Setting up a GraphQL server with Node.js today. Loving it!',
        hashtags: JSON.stringify(['#nodejs', '#graphql']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'python_lover',
        content: 'List comprehensions in Python are simply beautiful.',
        hashtags: JSON.stringify(['#python', '#coding']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'cyber_sec',
        content: 'Always remember to sanitize your database inputs!',
        hashtags: JSON.stringify(['#security', '#cybersec']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'ui_ux_designer',
        content: 'White space is not empty space. It is a powerful design tool.',
        hashtags: JSON.stringify(['#design', '#ux']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'startup_founder',
        content: 'Launching our MVP next week. The grind never stops.',
        hashtags: JSON.stringify(['#startup', '#entrepreneur']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'cloud_architect',
        content: 'Migrating from monolith to microservices is tough but worth it.',
        hashtags: JSON.stringify(['#cloud', '#microservices']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'data_nerd',
        content: 'Cleaning data takes 80% of the time, analyzing takes 20%.',
        hashtags: JSON.stringify(['#datascience', '#analytics']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'rust_ace',
        content: 'Fighting the borrow checker, but making progress!',
        hashtags: JSON.stringify(['#rustlang', '#programming']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'git_guru',
        content: 'Git rebase interactive is the ultimate tool for clean history.',
        hashtags: JSON.stringify(['#git', '#versioncontrol']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'linux_user',
        content: 'Just customized my terminal. I use Arch, by the way.',
        hashtags: JSON.stringify(['#linux', '#arch']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'sql_master',
        content: 'Wrote a complex JOIN query today and it worked on the first try.',
        hashtags: JSON.stringify(['#sql', '#database']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'mobile_dev',
        content: 'Flutter makes cross-platform development so much easier.',
        hashtags: JSON.stringify(['#flutter', '#mobiledev']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'open_source',
        content: 'Merged my first pull request into a major open-source project!',
        hashtags: JSON.stringify(['#opensource', '#github']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'typescript_fan',
        content: 'Once you go TypeScript, you never want to write plain JS again.',
        hashtags: JSON.stringify(['#typescript', '#webdev']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'aws_certified',
        content: 'Passed my AWS Solutions Architect exam today!',
        hashtags: JSON.stringify(['#aws', '#certification']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'game_dev',
        content: 'Optimizing rendering performance in Unity. Frame rates are climbing.',
        hashtags: JSON.stringify(['#gamedev', '#unity3d']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'agile_coach',
        content: 'Stand-ups should be 15 minutes, not an hour long status meeting.',
        hashtags: JSON.stringify(['#agile', '#scrum']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'serverless_dev',
        content: 'Lambda functions are great until you hit a cold start.',
        hashtags: JSON.stringify(['#serverless', '#aws']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'accessibility_advocate',
        content: 'Semantic HTML is the first step towards a more accessible web.',
        hashtags: JSON.stringify(['#a11y', '#html']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'crypto_coder',
        content: 'Smart contracts on Ethereum are fascinating to build.',
        hashtags: JSON.stringify(['#web3', '#solidity']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'qa_engineer',
        content: 'Found 10 edge cases the devs missed. You are welcome!',
        hashtags: JSON.stringify(['#testing', '#qa']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        author: 'remote_worker',
        content: 'Nothing beats coding from a cabin in the mountains.',
        hashtags: JSON.stringify(['#remotework', '#digitalnomad']),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Tweets', null, {});
  }
};