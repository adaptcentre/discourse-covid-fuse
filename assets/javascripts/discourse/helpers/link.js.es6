export default Ember.Helper.helper(function (params) {
  //return params[0][params[1]];
  return params[0][0]; // always first item of array
});
