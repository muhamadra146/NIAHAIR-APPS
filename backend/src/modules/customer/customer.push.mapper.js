const mapCustomerToAccurate = (customer) => {
  const payload = { name: customer.name };
  if (customer.email)       payload.email       = customer.email;
  if (customer.mobilePhone) payload.mobilePhone = customer.mobilePhone;
  if (customer.address)     payload.billStreet   = customer.address;
  if (customer.city)        payload.billCity     = customer.city;
  if (customer.province)    payload.billProvince = customer.province;
  if (customer.notes)       payload.notes       = customer.notes;
  return payload;
};

module.exports = { mapCustomerToAccurate };
