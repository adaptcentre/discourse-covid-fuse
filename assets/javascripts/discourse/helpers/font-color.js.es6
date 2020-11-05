export default Ember.Helper.helper(function (params) {
  let hex = params[0];
  return Ember.String.htmlSafe(`color: #${hex}`);
});
