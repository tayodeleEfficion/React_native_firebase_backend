const isEmpty = (string) => {
  if (string.trim() === "") return true;
  else return false;
};

const isEmail = (email) => {
  const reGEx = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  if (email.match(reGEx)) return true;
  else return false;
};


exports.validateSignup = (data) => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "email must not be empty";
  } else if (!isEmail) {
    errors.email = "not a valid email address";
  }

  if (isEmpty(data.password)) errors.password = "must not be empty";
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = "passwords do not match";
  if (isEmpty(data.username)) errors.username = "must not be empty";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  }
}

exports.validateLogin = (data) => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "email must not be empty";
  } else if (!isEmail) {
    errors.email = "not a valid email address";
  }
  if (isEmpty(data.password)) errors.email = "must not be empty";
  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  }
}

exports.reduceUserDetails = (data) => {
  let userDetail = {}
  if (!isEmpty(data.bio.trim())) userDetail.bio = data.bio
  if (!isEmpty(data.website.trim())) {
    if (data.website.trim().substring(0, 4) !== "http") {
      userDetail.website = `http://${data.website.trim()}`
    } else userDetail.website = data.website
  }
  if (!isEmpty(data.location.trim())) userDetail.location = data.location
  return userDetail
}