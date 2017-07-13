(function() {
  function handleError(err) {
    alert(err);
  }

  $(document).on('submit', '.login-form', function(e) {
    e.preventDefault();
    var form = this;
    var s3Credentials = {
      bucketName: form.bucketName.value,
      accessKey: form.accessKey.value,
      secretKey: form.secretKey.value
    };
    localStorage.setItem('s3Credentials', JSON.stringify(s3Credentials));
    load(s3Credentials, function(err) {
      if (err) {
        handleError(err);
      } else {
        $('.login-container').hide();
        $('.sensor-container').show();
      }
    });
  });

  $(function() {
    var s3Credentials = localStorage.getItem('s3Credentials');
    if (s3Credentials) {
      s3Credentials = JSON.parse(s3Credentials);
      var form = $('.login-form')[0];
      form.bucketName.value = s3Credentials.bucketName;
      form.accessKey.value = s3Credentials.accessKey;
      form.secretKey.value = s3Credentials.secretKey;
    }
  });

  $(document).on('change', '.sensor-select', function(e) {
    var sensor = $(this).val();
    var $dateSelect = $('.date-select').empty();
    $dateSelect.parent().toggleClass('hidden', sensor.length === 0);
    if (sensor.length) {
      loadDates(sensor, function(err, dates) {
        if (err) {
          handleError(err);
        } else {
          $dateSelect.append($('<option>'));
          dates.forEach(function(date) {
            $dateSelect.append($('<option>').val(sensor + '/' + date + '/').text(date));
          });
        }
      })
    }
  });

  $(document).on('change', '.date-select', function(e) {
    var datePrefix = $(this).val();
    loadPhotos(datePrefix, function(err, photos) {
      $('.photo-viewer').removeClass('hidden').empty();
      if (err) {
        handleErr(err);
      } else {
        photos.forEach(function(photo) {
          var url = window.s3.getSignedUrl('getObject', {
            Key: photo,
            Expires: 6000
          });
          $('.photo-viewer').append($('<img>').attr('src', url));
        });
      }
    });
  });

  function load(s3Credentials, callback) {
    login(s3Credentials, function(err, s3) {
      if (err) {
        callback(err);
      } else {
        window.s3 = s3;
        loadSensors(function(err, sensors) {
          if (err) {
            callback(err);
          } else {
            var $sensorSelect = $('.sensor-select').empty();
            $sensorSelect.append('<option>');
            sensors.forEach(function(sensor) {
              $sensorSelect.append($('<option>').val(sensor).text(sensor));
            });
            callback(null);
          }
        });
      }
    });
  }

  function login(s3Credentials, callback) {
    AWS.config.accessKeyId = s3Credentials.accessKey;
    AWS.config.secretAccessKey = s3Credentials.secretKey;
    AWS.config.region = 'us-west-2';
    var s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      params: {
        Bucket: s3Credentials.bucketName
      }
    });
    s3.listObjects(function(err) {
      callback(err, s3);
    });
  }

  function loadSensors(callback) {
    var sensors = [];
    var params = {
      Delimiter: '/'
    };
    window.s3.listObjects(params, function(err, data) {
      data.CommonPrefixes.forEach(function(commonPrefix) {
        sensors.push(commonPrefix.Prefix.toString().replace(/\//, ''));
      });
      callback(null, sensors);
    });
  }

  function loadDates(sensor, callback) {
    var params = {
      Delimiter: '/',
      Prefix: sensor + '/'
    };
    window.s3.listObjects(params, function(err, data) {
      if (err) {
        callback(err);
      } else {
        var dates = [];
        data.CommonPrefixes.forEach(function(commonPrefix) {
          var date = commonPrefix.Prefix.toString().replace(/\/$/, "").replace(/.*\//, "");
          dates.push(date);
        });
        callback(null, dates);
      }
    });
  }

  function loadPhotos(prefix, callback) {
    var params = {
      Prefix: prefix
    };
    window.s3.listObjects(params, function(err, data) {
      if (err) {
        callback(err);
      } else {
        var results = [];
        data.Contents.forEach(function(object) {
          if (!object.Key.endsWith('/')) {
            results.push(object.Key);
          }
        });
        callback(null, results);
      }
    });
  }
})();
