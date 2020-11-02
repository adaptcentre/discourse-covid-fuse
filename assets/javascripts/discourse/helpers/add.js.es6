export default Ember.Helper.helper(function (params) {
  return params.reduce( (acc, cur) => acc + cur, 0);
});
