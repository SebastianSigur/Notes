const User = require('../models/User');
const Note = require('../models/Note');
const asyncHandler = require('express-async-handler'); // for handling errors in async functions
const bcrypt = require('bcrypt'); // for hashing passwords
 
// @desc    Get all users
// @route   GET /api/users
// @access  Private
const getAllUsers = asyncHandler(async (req, res) => {
    // lean() returns a plain JS object instead of a mongoose document, -password excludes the password field
    const users = await User.find().select('-password').lean(); 
    if(!users?.length){
        return res.status(404).json({message: "No users found"});
    }
    res.json(users);
})
// @desc Create a user
// @route POST /users
// @access Private
const createNewUser = asyncHandler(async (req, res) => {
    const { username, password, roles } = req.body;

    //Confirm data
    if(!username || !password || !Array.isArray(roles) || !roles.length){
        return res.status(400).json({message: "Please provide all required fields"});
    }

    //Check for duplicates
    const duplicates = await User.findOne({ username }).lean().exec(); //exec() returns a promise instead of a query. 

    if(duplicates){
        return res.status(409).json({message: "Username already exists"});
    }

    //Hash password
    const hashPassword = await bcrypt.hash(password, 10); // 10 is the number of rounds of hashing to be done on the password

    const userObject = { username, "password": hashPassword, roles };

    // Create and store new user
    const newUser = await User.create(userObject);
    if (newUser) {
        res.status(201).json({message: `User ${username} created successfully`});
    }
    else{
        res.status(400).json({message: "Invalid user data"});
    }
})

// @desc Update a user
// @route PATCH /users
// @access Private
const updateUser = asyncHandler(async (req, res) => {
    const { id, username, roles, active, password } = req.body;

    //Confirm data 
    if(!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean'){
        return res.status(400).json({message: "Please provide all required fields"});
    }

    const user = await User.findById(id).exec(); // not lean because we need the document to update it

    if(!user){
        return res.status(404).json({message: "User not found"});
    }

    //Check for duplicates
    const duplicate = await User.findOne({ username }).lean().exec();
    //Allow update to the original user
    if (duplicate &&  duplicate?._id.toString() !== id) {
        return res.status(409).json({message: "Username already exists"});
    }

    //Update user
    user.username = username;
    user.roles = roles;
    user.active = active;

    if(password){
        user.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await user.save(); //Could not call save() on user if it was lean

    res.json({message: `User ${updatedUser.username} updated successfully`});
})

// @desc Delete a user
// @route PATCH /users
// @access Private
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.body;

    //Confirm data
    if(!id){
        return res.status(400).json({message: "Please provide all required fields"});
    }

    const note = await Note.findOne({ user: id }).lean().exec();
    if (note) {
        return res.status(409).json({message: "User has notes"});
    }

    const user = await User.findById(id).exec();

    if(!user){
        return res.status(404).json({message: "User not found"});
    }

    await user.remove();

    res.json({message: `User ${user.username} deleted successfully`});
})

module.exports = { getAllUsers, createNewUser, updateUser, deleteUser }