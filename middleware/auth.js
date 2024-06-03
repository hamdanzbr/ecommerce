const verifyAdminLogin = (req, res, next) => {
  if (req.session.admin && req.session.admin.loggedIn) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};

const redirectIfLoggedIn = (req, res, next) => {
  if (req.session.admin && req.session.admin.loggedIn) {
    res.redirect('/admin');
  } else {
    next();
  }
};

module.exports = { verifyAdminLogin, redirectIfLoggedIn };
