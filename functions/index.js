const functions = require("firebase-functions");
const app = require("express")();
const {
  createPost,
  getAllPost,
  getPost,
  commentOnPost,
  likePost,
  unlikePost,
  deletePost

} = require("./handlers/posts");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser
} = require("./handlers/users");
const FBAuth = require("./util/FBAuth");
const {
  db
} = require("./util/admin")

app.get("/posts", getAllPost);
app.post("/post", FBAuth, createPost);
app.get("/post/:postId", getPost)
app.post("/post/:postId/comment", FBAuth, commentOnPost)
app.get("/post/:postId/like", FBAuth, likePost)
app.get("/post/:postId/unlike", FBAuth, unlikePost)
app.delete("/post/:postId", FBAuth, deletePost)



app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails)
app.get("/user", FBAuth, getAuthenticatedUser)

exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions.region('us-central1').firestore.document(`likes/{id}`).onCreate(snapshot => {
  db.doc(`/post/${snapshot.data().postId}`).get().then(doc => {
      if (doc.exists) {
        return db.doc(`/notification/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: doc.data().username,
          sender: snapshot.data().username,
          type: 'like',
          read: false,
          postId: doc.id
        })
      }
    }).then(() => {
      return
    })
    .catch(err => {
      console.error(err)
      return
    })
})

exports.deleteNotificationOnUnlike = functions.region("us-central1").firestore.document('likes/{id}').onDelete(snapshot => {
  db.doc(`/notification/${snapshot.id}`).delete().then(() => {
    return
  }).catch(err => {
    console.error(err)
    return
  })
})

exports.createNotificationOnComment = functions.region('us-central1').firestore.document("comments/{id}").onCreate(snapshot => {
  db.doc(`/post/${snapshot.data().postId}`).get().then(doc => {
      if (doc.exists) {
        return db.doc(`/notification/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: doc.data().username,
          sender: snapshot.data().username,
          type: 'comment',
          read: false,
          postId: doc.id
        })
      }
    }).then(() => {
      return
    })
    .catch(err => {
      console.error(err)
      return
    })
})