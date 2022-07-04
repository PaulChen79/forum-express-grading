const bcrypt = require('bcryptjs')
const { User, Restaurant, Comment, Favorite, Like, Followship } = require('../models')
const { imgurFileHandler } = require('../helpers/file-helpers')

const userController = {
  signUpPage: (req, res) => {
    res.render('signup')
  },
  signUp: async (req, res, next) => {
    try {
      if (req.body.password !== req.body.passwordCheck) throw new Error('Passwords do not match!')
      const user = await User.findOne({ where: { email: req.body.email } })
      if (user) throw new Error('Email already exists!')
      const hash = await bcrypt.hash(req.body.password, 10)
      await User.create({
        name: req.body.name,
        email: req.body.email,
        password: hash
      })
      req.flash('success_messages', '成功註冊帳號！')
      res.redirect('/signin')
    } catch (error) {
      next(error)
    }
  },
  signInPage: (req, res) => {
    res.render('signin')
  },
  signIn: (req, res) => {
    req.flash('success_messages', '成功登入！')
    res.redirect('/restaurants')
  },
  logout: (req, res) => {
    req.flash('success_messages', '登出成功！')
    req.logout()
    res.redirect('/signin')
  },
  getUser: async (req, res, next) => {
    try {
      const id = req.params.id
      let user = await User.findByPk(id, {
        nest: true,
        include: [
          { model: Comment, include: Restaurant },
          { model: Restaurant, as: 'FavoritedRestaurants' },
          { model: User, as: 'Followings' },
          { model: User, as: 'Followers' }
        ]
      })
      if (!user) throw new Error('使用者不存在！')
      user = await user.toJSON()
      user.isFollowed = req.user.Followings.some(following => following.id === user.id)
      return res.render('users/profile', { userProfile: user })
    } catch (error) {
      next(error)
    }
  },
  editUser: async (req, res, next) => {
    try {
      const id = req.params.id
      const user = await User.findByPk(id, { raw: true })
      if (!user) throw new Error('使用者不存在！')
      return res.render('users/edit', { user })
    } catch (error) {
      next(error)
    }
  },
  putUser: async (req, res, next) => {
    try {
      const id = req.params.id
      const { name } = req.body
      const { file } = req
      const user = await User.findByPk(id)
      const filePath = await imgurFileHandler(file)
      if (!user) throw new Error('使用者不存在！')
      await user.update({ name: name || user.name, image: filePath || user.image })
      req.flash('success_messages', '使用者資料編輯成功')
      res.redirect(`/users/${req.params.id}`)
    } catch (error) {
      next(error)
    }
  },
  addFavorite: async (req, res, next) => {
    try {
      const { restaurantId } = req.params
      const restaurant = await Restaurant.findByPk(restaurantId)
      const favorite = await Favorite.findOne({
        where: {
          userId: req.user.id,
          restaurantId
        }
      })
      if (!restaurant) throw new Error("Restaurant didn't exist!")
      if (favorite) throw new Error('You have favorited this restaurant!')
      restaurant.increment('favoriteCounts')
      await Favorite.create({
        userId: req.user.id,
        restaurantId
      })
      return res.redirect('back')
    } catch (error) {
      next(error)
    }
  },
  removeFavorite: async (req, res, next) => {
    try {
      const { restaurantId } = req.params
      const restaurant = await Restaurant.findByPk(restaurantId)
      const favorite = await Favorite.findOne({
        where: {
          userId: req.user.id,
          restaurantId
        }
      })
      if (!restaurant) throw new Error("Restaurant didn't exist!")
      if (!favorite) throw new Error("You haven't favorited this restaurant")
      restaurant.decrement('favoriteCounts')
      await favorite.destroy()
      return res.redirect('back')
    } catch (error) {
      next(error)
    }
  },
  addLike: async (req, res, next) => {
    try {
      const { restaurantId } = req.params
      const restaurant = await Restaurant.findByPk(restaurantId)
      const like = await Like.findOne({
        where: {
          userId: req.user.id,
          restaurantId
        }
      })
      if (!restaurant) throw new Error("Restaurant didn't exist!")
      if (like) throw new Error('You have liked this restaurant!')
      await Like.create({
        userId: req.user.id,
        restaurantId
      })
      return res.redirect('back')
    } catch (error) {
      next(error)
    }
  },
  removeLike: async (req, res, next) => {
    try {
      const like = await Like.findOne({
        where: {
          userId: req.user.id,
          restaurantId: req.params.restaurantId
        }
      })
      if (!like) throw new Error("You haven't liked this restaurant")
      await like.destroy()
      return res.redirect('back')
    } catch (error) {
      next(error)
    }
  },
  getTopUsers: async (req, res, next) => {
    try {
      let users = await User.findAll({
        include: [{ model: User, as: 'Followers' }]
      })
      users = await users.map(user => ({
        ...user.toJSON(),
        followerCount: user.Followers.length,
        isFollowed: req.user.Followings.some(following => following.id === user.id)
      }))
      users = await users.sort((a, b) => b.followerCount - a.followerCount)
      return res.render('top-users', { users })
    } catch (error) {
      next(error)
    }
  },
  addFollowing: async (req, res, next) => {
    try {
      const { userId } = req.params
      const user = await User.findByPk(userId)
      const followship = await Followship.findOne({
        where: {
          followerId: req.user.id,
          followingId: req.params.userId
        }
      })
      if (!user) throw new Error("User didn't exist!")
      if (followship) throw new Error('You are already following this user!')
      await Followship.create({
        followerId: req.user.id,
        followingId: userId
      })
      return res.redirect('back')
    } catch (error) {
      next(error)
    }
  },
  removeFollowing: async (req, res, next) => {
    try {
      const followship = await Followship.findOne({
        where: {
          followerId: req.user.id,
          followingId: req.params.userId
        }
      })
      if (!followship) throw new Error("You haven't followed this user!")
      await followship.destroy()
      return res.redirect('back')
    } catch (error) {
      next(error)
    }
  }
}

module.exports = userController
