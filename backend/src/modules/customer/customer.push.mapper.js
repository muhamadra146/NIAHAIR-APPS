const mapCustomerToAccurate = (customer) => {
  const payload = { name: customer.name };
  if (customer.email) payload.email = customer.email;
  if (customer.mobilePhone) payload.mobilePhone = customer.mobilePhone;
  if (customer.address) payload.billStreet = customer.address;
  return payload;
};

module.exports = { mapCustomerToAccurate };
