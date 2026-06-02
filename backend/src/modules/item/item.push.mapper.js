const mapItemToAccurate = (item) => {
  const payload = {
    name: item.name,
    itemType: item.itemType,
  };
  if (item.itemCode) payload.no = item.itemCode;
  return payload;
};

module.exports = { mapItemToAccurate };
