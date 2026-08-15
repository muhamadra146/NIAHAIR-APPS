const mapAccurateToGlAccount = (item) => ({
  accurateGlAccountId: parseInt(item.id, 10),
  number:   item.no          ?? item.number ?? null,
  name:     item.name        ?? "",
  category: item.accountType ?? null,
  isActive: item.suspended === false || item.suspended === "false" ? true : !item.suspended,
});

module.exports = { mapAccurateToGlAccount };
