(function() {
  function handleError(err) {
    alert(err);
  }

  $(document).on('submit', '.login-form', function(e) {
    e.preventDefault();
    var form = this;
    var s3Credentials = {
      bucketName: form.bucketName.value,
      region: form.region.value,
      accessKey: form.accessKey.value,
      secretKey: form.secretKey.value
    };
    load(s3Credentials, function(err) {
      if (err) {
        handleError(err);
      } else {
        localStorage.setItem('s3Credentials', JSON.stringify(s3Credentials));
        $('.login-container').addClass('hidden');
        $('.camera-container').removeClass('hidden');
      }
    });
  });

  $(function() {
    var s3Credentials = localStorage.getItem('s3Credentials');
    if (s3Credentials) {
      s3Credentials = JSON.parse(s3Credentials);
      var form = $('.login-form')[0];
      form.bucketName.value = s3Credentials.bucketName;
      form.region.value = s3Credentials.region;
      form.accessKey.value = s3Credentials.accessKey;
      form.secretKey.value = s3Credentials.secretKey;
    }
  });

  $(document).on('change', '.camera-select', function(e) {
    var camera = $(this).val();
    $('.photo-viewer').addClass('hidden');
    var $dateSelect = $('.date-select').empty();
    $dateSelect.parent().toggleClass('hidden', camera.length === 0);
    if (camera.length) {
      loadDates(camera, function(err, dates) {
        if (err) {
          handleError(err);
        } else {
          $dateSelect.append($('<option>'));
          dates.forEach(function(date) {
            $dateSelect.append($('<option>').val(camera + '/' + date + '/').text(date));
          });
        }
      })
    }
  });

  $(document).on('change', '.date-select', function(e) {
    var $photoViewer = $('.photo-viewer').removeClass('hidden').empty();
    var $carousel = $('<div id="carousel" class="carousel slide"></div>').appendTo($photoViewer);
    var $carouselInner = $('<div class="carousel-inner"></div>').appendTo($carousel);
    $('<a class="left carousel-control" data-toggle="tooltip" data-placement="left" title="Keyboard Shortcut: Left Arrow" href="#carousel" role="button" data-slide="prev"><span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span><span class="sr-only">Previous</span></a><a class="right carousel-control" data-toggle="tooltip" data-placement="right" title="Keyboard Shortcut: Right Arrow" href="#carousel" role="button" data-slide="next"><span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span><span class="sr-only">Next</span></a>').appendTo($carousel);
    var datePrefix = $(this).val();
    loadPhotos(datePrefix, function(err, photos) {
      if (err) {
        handleErr(err);
      } else {
        photos.forEach(function(photo, i) {
          var $carouselItem = $('<div class="item"></div>').appendTo($carouselInner);
          if (i === 0) {
            $carouselItem.addClass('active');
          }
          var url = window.s3.getSignedUrl('getObject', {
            Key: photo.Key,
            Expires: 6000
          });
          $('<img>').attr('src', url).appendTo($carouselItem);

          var filename = photo.Key.replace(/.*\//, '');
          var $carouselCaption = $('<div class="carousel-caption"></div>').appendTo($carouselItem);
          $('<h3></h3>').text(filename).appendTo($carouselCaption);

          var lastModified = new Date(photo.LastModified);
          var hour = lastModified.getHours() % 12;
          if (hour === 0) {
            hour = 12
          }
          var minutes = ("00" + lastModified.getMinutes()).slice(-2);
          var seconds = ("00" + lastModified.getSeconds()).slice(-2);
          var ampm = lastModified.getHours() > 11 ? 'PM' : 'AM';
          var lastModifiedFormatted = hour + ':' + minutes + ':' + seconds + ampm;
          $('<p></p>').text(lastModifiedFormatted).appendTo($carouselCaption);
        });
      }
    });
    $carousel.carousel({
      interval: false,
      wrap: false
    }).find('[data-toggle="tooltip"]').tooltip();
  });

  // built-in keyboard option on carousel only works if the carousel has focus
  $(document).keydown(function(e) {
    if (e.keyCode === 37) {
      // Previous
      $("#carousel").carousel('prev');
    }
    if (e.keyCode === 39) {
      // Next
      $("#carousel").carousel('next');
    }
  });

  function load(s3Credentials, callback) {
    login(s3Credentials, function(err, s3) {
      if (err) {
        callback(err);
      } else {
        window.s3 = s3;
        loadCameras(function(err, cameras) {
          if (err) {
            callback(err);
          } else {
            var $cameraSelect = $('.camera-select').empty();
            $cameraSelect.append('<option>');
            cameras.forEach(function(camera) {
              $cameraSelect.append($('<option>').val(camera).text(camera));
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
    AWS.config.region = s3Credentials.region;
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

  function loadCameras(callback) {
    var cameras = [];
    var params = {
      Delimiter: '/'
    };
    window.s3.listObjects(params, function(err, data) {
      data.CommonPrefixes.forEach(function(commonPrefix) {
        cameras.push(commonPrefix.Prefix.toString().replace(/\//, ''));
      });
      callback(null, cameras);
    });
  }

  function loadDates(camera, callback) {
    var params = {
      Delimiter: '/',
      Prefix: camera + '/'
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
            results.push(object);
          }
        });
        callback(null, results);
      }
    });
  }
})();
