const {
  db,
  admin
} = require("../util/admin");
const firebase = require("firebase");
const config = require("../util/config");
firebase.initializeApp(config);
const {
  validateSignup,
  validateLogin,
  reduceUserDetails,
} = require("../util/validators");

exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    username: req.body.username,
  };

  const {
    valid,
    errors
  } = validateSignup(newUser);

  if (!valid) return res.status(400).json(errors);
  const noimage = "noimage.png";

  let token, userId;
  db.doc(`/users/${newUser.username}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({
          username: "this username has been taken",
        });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredential = {
        username: newUser.username,
        email: newUser.email,
        createAt: new Date().toISOString(),
        userId,
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noimage}?alt=media`,
      };
      return db.doc(`/users/${newUser.username}`).set(userCredential);
    })
    .then(() => {
      return res.json({
        token,
      });
    })
    .catch((err) => {
      console.log(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(300).json({
          Email: "email already in taken by another user",
        });
      }
      return res.status(500).json({
        err: err.code,
      });
    });
};

exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  const {
    valid,
    errors
  } = validateLogin(user);
  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({
        token,
      });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        return res.status(403).json({
          GENERAL: "wrong credentials",
        });
      } else {
        return res.status(500).json({
          err: err.code,
        });
      }
    });
};
let imageFilename;
let imageToBeUploaded = {};

exports.uploadImage = (req, res) => {
  const Busboy = require("busboy");
  const path = require("path");
  const fs = require("fs");
  const os = require("os");
  const busboy = new Busboy({
    headers: req.headers,
  });
  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.json({
        Error: "wrong file type submitted",
      });
    }
    const imageExtension = filename.split(".")[filename.split(".").length + 1];
    imageFilename = `${Math.round(
      Math.random() * 1000000000000
    )}.${imageExtension}`;
    const filePath = path.join(os.tmpdir(), imageFilename);
    imageToBeUploaded = {
      filePath,
      mimetype,
    };
    file.pipe(fs.createWriteStream(filePath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filePath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFilename}?alt=media`;
        return db.doc(`/users/${req.user.username}`).update({
          imageUrl,
        });
      })
      .then(() => {
        return res.json({
          message: "image uploaded successfully",
        });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({
          error: err.code,
        });
      });
  });
  busboy.end(req.rawBody);
};

//add user details
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);
  db.doc(`/users/${req.user.username}`)
    .update(userDetails)
    .then(() => {
      return res.json({
        msg: "details added successfully",
      });
    })
    .catch((err) => {
      return res.status(500).json({
        err: err.code,
      });
    });
};

exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.username}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credential = doc.data();
        return db
          .collection("likes")
          .where("username", "==", req.user.username)
          .get();
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });
      return db
        .collection("notification")
        .where("recipient", "==", req.user.username)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    })
    .then((data) => {
      userData.notification = [];
      data.forEach((doc) => {
        userData.notification.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          postId: doc.data().postId,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({
        error: err.code,
      });
    });
};
//==================NOTIFICATION ROUTES=============
exports.markNotificationRead = (req, res) => {
  let batch = db.batch()
  req.body.forEach(notificationId => {
    const notification = db.doc(`/notification/${notificationId}`)
    batch.update(notification, {
      read: true
    })
  })
  batch.commit().then(() => {
    return res.json({
      msg: "notification has been marked as read"
    })
  }).catch(err => {
    console.error(err)
    return res.status(500).json(err)
  })
}
//===============================end of marked as read end point===========
//===== get any user detail============
exports.getSingleUserDetails = (req, res) => {
  let userData = {}
  db.doc(`/users/${req.params.username}`).get().then(doc => {
      if (doc.exists) {
        userData.user = doc.data()
        return db.collection("post").where("username", "==", req.params.username)
          .orderBy("createdAt", "desc")
          .get()
      } else {
        return res.status(404).json({
          error: "User not found"
        })
      }
    })
    .then(data => {
      userData.post = []
      data.forEach(doc => {
        userData.post.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          username: doc.data().username,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          postId: doc.id
        })
      })
      return res.json(userData)
    })
    .catch(err => {
      console.error(err)
      return res.status(500).json({
        error: err
      })
    })
}
//=====================end of function========================