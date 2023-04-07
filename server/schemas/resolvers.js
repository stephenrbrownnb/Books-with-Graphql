const { AuthenticationError } = require('apollo-server-express');
const { User } = require('../models');
const { signToken } = require('../utils/auth');

const resolvers = {
  Query: {
    me: async (parent, args, context) => {
      if (context.user) {
        const user = await User.findOne({ _id: context.user._id });
        return user;
      }
      throw new AuthenticationError('You need to be logged in!');
    },
    // get a single user by their username or id
    User: async (parent, { username, _id }) => {
      const foundUser = await User.findOne({
        $or: [{ _id: _id }, { username: username }],
      });
      if (!foundUser) {
        throw new AuthenticationError('Cannot find a user with this id or username!');
      }
      return foundUser;
    },
  },
  Mutation: {
    // create a new user
    addUser: async (parent, { username, email, password }) => {
      const user = await User.create({ username, email, password });
      if (!user) {
        throw new AuthenticationError('Something went wrong!');
      }
      const token = signToken(user);
      return { token, user };
    },
    // login a user and return a token
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new AuthenticationError('Can\'t find this user!');
      }
      const correctPw = await user.isCorrectPassword(password);
      if (!correctPw) {
        throw new AuthenticationError('Wrong password!');
      }
      const token = signToken(user);
      return { token, user };
    },
    // save a book to a user's `savedBooks` field by adding it to the set (to prevent duplicates)
    saveBook: async (parent, { book }, context) => {
      if (context.user) {
        const updatedUser = await User.findOneAndUpdate(
          { _id: context.user._id },
          { $addToSet: { savedBooks: book } },
          { new: true, runValidators: true }
        );
        return updatedUser;
      }
      throw new AuthenticationError('You need to be logged in!');
    },
    // remove a book from `savedBooks`
    removeBook: async (parent, { bookId }, context) => {
      if (context.user) {
        const updatedUser = await User.findOneAndUpdate(
          { _id: context.user._id },
          { $pull: { savedBooks: { bookId: bookId } } },
          { new: true }
        );
        if (!updatedUser) {
          throw new AuthenticationError("Couldn't find user with this id!");
        }
        return updatedUser;
      }
      throw new AuthenticationError('You need to be logged in!');
    },
  },
};

module.exports = resolvers;