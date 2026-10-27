'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const users = await queryInterface.sequelize.query('SELECT id FROM "Users"', { type: Sequelize.QueryTypes.SELECT });
    const tweets = await queryInterface.sequelize.query('SELECT id FROM "Tweets"', { type: Sequelize.QueryTypes.SELECT });

    // каждый пользователь лайкает примерно треть твитов
    const likes = [];
    for (const user of users) {
      for (const tweet of tweets) {
        if (Math.random() < 0.3) {
          likes.push({ userId: user.id, tweetId: tweet.id, createdAt: new Date() });
        }
      }
    }

    if (likes.length > 0) {
      await queryInterface.bulkInsert('Likes', likes);
    }

    // пересчитываем счётчики по таблице Likes
    await queryInterface.sequelize.query(
      'UPDATE "Tweets" SET "likesCount" = (SELECT COUNT(*) FROM "Likes" WHERE "Likes"."tweetId" = "Tweets".id)'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Likes', null, {});
    await queryInterface.sequelize.query('UPDATE "Tweets" SET "likesCount" = 0');
  }
};
