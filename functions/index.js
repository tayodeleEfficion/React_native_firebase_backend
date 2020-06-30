const functions = require("firebase-functions");
const app = require("express")();
const {
  createPost,
  getAllPost,
  getPost,
  commentOnPost,
  likePost,
  unlikePost

} = require("./handlers/posts");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser
} = require("./handlers/users");
const FBAuth = require("./util/FBAuth");

app.get("/posts", getAllPost);
app.post("/post", FBAuth, createPost);
app.get("/post/:postId", getPost)
app.post("/post/:postId/comment", FBAuth, commentOnPost)
app.get("/post/:postId/like", FBAuth, likePost)
app.get("/post/:postId/unlike", FBAuth, unlikePost)


app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails)
app.get("/user", FBAuth, getAuthenticatedUser)

exports.api = functions.https.onRequest(app);