const {
  db
} = require("../util/admin");

exports.getAllPost = (req, res) => {
  db.collection("/post")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let post = [];
      data.forEach((doc) => {
        post.push({
          postId: doc.id,
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          username: doc.data().username,
        });
      });
      return res.json(post);
    })
    .catch((err) => {
      console.error(err);
    });
};

exports.createPost = (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({
      message: "post body cannot be empty",
    });
  }
  const newPost = {
    username: req.user.username,
    body: req.body.body,
    createdAt: new Date().toISOString(),
    userImage: req.user.imageUrl,
    likeCount: 0,
    commentCount: 0,
  };
  db.collection("post")
    .add(newPost)
    .then((doc) => {
      const resPost = newPost;
      resPost.postId = doc.id;
      res.status(201).json(resPost);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({
        err: "something went wrong",
      });
    });
};

exports.getPost = (req, res) => {
  let postData = {};
  db.doc(`/post/${req.params.postId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(400).json({
          msg: "post not found",
        });
      }
      postData = doc.data();
      postData.postId = doc.id;
      return db
        .collection("comments")
        .where("postId", "==", req.params.postId)
        .get();
    })
    .then((data) => {
      postData.comments = [];
      data.forEach((doc) => {
        postData.comments.push(doc.data());
      });
      return res.json(postData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({
        err: err.code,
      });
    });
};
exports.commentOnPost = (req, res) => {
  if (req.body.body.trim() === "")
    return res.status(400).json({
      msg: "must not be emoty",
    });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    postId: req.params.postId,
    username: req.user.username,
    userImage: req.user.imageUrl,
  };
  db.doc(`/post/${req.params.postId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        res.status(404).json({
          error: "post not found",
        });
      }
      return doc.ref.update({
        comments: doc.data().commentCount + 1
      })
    }).then(() => {
      return db.collection("comments").add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => {
      res.status(500).json({
        err: "something went wrong",
      });
    });
};

exports.likePost = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("username", "==", req.user.username)
    .where("postId", "==", req.params.postId)
    .limit(1);
  const postDocument = db.doc(`/post/${req.params.postId}`);
  let postData
  postDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        postData = doc.data();
        postData.postId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({
          error: "post not found"
        });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            postId: req.params.postId,
            username: req.user.username,
          })
          .then(() => {
            postData.likeCount++;
            return postDocument.update({
              likeCount: postData.likeCount
            });
          })
          .then(() => {
            return res.json(postData);
          });
      } else {
        return res.status(400).json({
          error: "post has already been liked"
        });
      }
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({
        error: err
      });
    });
};



exports.unlikePost = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("username", "==", req.user.username)
    .where("postId", "==", req.params.postId)
    .limit(1);
  const postDocument = db.doc(`/post/${req.params.postId}`);
  let postData = {};
  postDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        postData = doc.data();
        postData.postId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({
          error: "post not found"
        });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({
          error: "post not liked"
        });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            postData.likeCount--;
            return postDocument.update({
              likeCount: postData.likeCount
            });
          })
          .then(() => {
            return res.json(postData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({
        error: err
      });
    });
};
//==================================================
//DELETE POST====================================
//===============================================
exports.deletePost = (req, res) => {
  const document = db.doc(`/post/${req.params.postId}`)
  document.get().then(doc => {
      if (!doc.exists) {
        return res.status(404).json({
          error: "POST NOT FOUND"
        })
      }
      if (doc.data().username !== req.user.username) {
        return res.status(403).json({
          eror: "UNAUTHORIZED ACTION"
        })
      } else {
        return document.delete()
      }
    }).then(() => {
      res.json({
        msg: "POST DELETED SUCCESSFULLY"
      })
    })
    .catch(err => {
      console.error(err)
      return res.status(500).json({
        error: err.code
      })
    })
}