function auth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ msg: "Unauthorized" });
  }
  req.user = { id: req.session.userId, role: req.session.role };
  next();
}

function role(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: "Unauthorized" });
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ msg: "Forbidden" });
    }
    next();
  };
}

module.exports = { auth, role };
