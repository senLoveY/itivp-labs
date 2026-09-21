'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Tweet extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Tweet.init({
    author: DataTypes.STRING,
    content: DataTypes.TEXT,
    hashtags: DataTypes.JSONB
  }, {
    sequelize,
    modelName: 'Tweet',
  });
  return Tweet;
};