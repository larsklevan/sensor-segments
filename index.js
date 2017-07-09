$(document).on('submit', '.login-form', function(e) {
  e.preventDefault();
  var form = this;
  localStorage.setItem('s3Credentials', JSON.stringify({
    bucketName: form.bucketName.value,
    accessKey: form.accessKey.value,
    secretKey: form.secretKey.value
  }));
  $('.login-container').hide();
  $('.sensor-container').show();
});

$(function() {
  console.log('here')
  var s3Credentials = localStorage.getItem('s3Credentials');
  if (s3Credentials) {
    s3Credentials = JSON.parse(s3Credentials);
    var form = $('.login-form')[0];
    console.log(form)
    form.bucketName.value = s3Credentials.bucketName;
    form.accessKey.value = s3Credentials.accessKey;
    form.secretKey.value = s3Credentials.secretKey;
  }
});
