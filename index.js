(function() {
  function handleError(err) {
    alert(err);
  }
  function timeOfDay(date) {
    var hour = date.getHours() % 12;
    if (hour === 0) {
      hour = 12
    }
    var minutes = ("00" + date.getMinutes()).slice(-2);
    var seconds = ("00" + date.getSeconds()).slice(-2);
    var ampm = date.getHours() > 11 ? 'PM' : 'AM';
    return hour + ':' + minutes + ':' + seconds + ampm;
  }

  $(function () {
    $('[data-toggle="popover"]').popover()
  });

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
        $('#logout-actions').removeClass('hidden');
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

  $(document).on('change', '.classroom-select', function(e) {
    var classroom = $(this).val();
    var $cameraSelect = $('.camera-select').trigger('reset');
    if (classroom.length) {
      listFolders(classroom, function(err, paths) {
        if (err) {
          handleError(err);
        } else {
          if (paths.length) {
            $cameraSelect.removeClass('hidden').append($('<option></option>').text('Select a camera'));
            paths.forEach(function(path) {
              $cameraSelect.append($('<option></option>').val(path).text(pathToLabel(path)));
            });
          }
        }
      })
    }
  });

  $(document).on('reset', '.camera-select', function() {
    $(this).empty().addClass('hidden');
    $('.date-select').trigger('reset');
  })

  $(document).on('change', '.camera-select', function(e) {
    var camera = $(this).val();
    var $dateSelect = $('.date-select').trigger('reset');
    if (camera.length) {
      listFolders(camera, function(err, paths) {
        if (err) {
          handleError(err);
        } else {
          $dateSelect.removeClass('hidden').append($('<option></option>').text('Select a date'));
          paths.forEach(function(path) {
            $dateSelect.append($('<option></option>').val(path).text(pathToLabel(path)));
          });
        }
      })
    }
  });

  $(document).on('reset', '.date-select', function() {
    $(this).empty().addClass('hidden');
    $('.photo-container').trigger('reset');
  });

  $(document).on('change', '.date-select', function(e) {
    var $photoViewer = $('.photo-viewer').empty();
    var $carousel = $('<div id="carousel" class="carousel slide"></div>').appendTo($photoViewer);
    var $carouselInner = $('<div class="carousel-inner"></div>').appendTo($carousel);
    $('<a class="left carousel-control" data-toggle="tooltip" data-placement="right" title="Keyboard Shortcut: Left Arrow" href="#carousel" role="button" data-slide="prev"><span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span><span class="sr-only">Previous</span></a><a class="right carousel-control" data-toggle="tooltip" data-placement="left" title="Keyboard Shortcut: Right Arrow" href="#carousel" role="button" data-slide="next"><span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span><span class="sr-only">Next</span></a>').appendTo($carousel);
    var datePrefix = $(this).val();
    loadPhotos(datePrefix, function(err, photos) {
      if (err) {
        handleErr(err);
      } else {
        $('.photo-container').toggleClass('hidden', photos.length === 0);
        photos.forEach(function(photo, i) {
          var key = photo.Key.replace(/.*still_/, '').replace(/\..*/, '');
          var timestamp = new Date(Date.UTC.apply(Date.UTC, key.split('-')));
          var $carouselItem = $('<div class="item"></div>').data('timestamp', timestamp).appendTo($carouselInner);
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
          $('<p></p>').text(timeOfDay(timestamp)).appendTo($carouselCaption);
        });
      }
    });
    $carousel.carousel({
      interval: false,
      wrap: false
    }).find('[data-toggle="tooltip"]').tooltip();
  });

  $(document).on('reset', '.photo-container', function() {
    $(this).addClass('hidden');
    $('.sensors-list tbody tr:not(:first-child)').remove();
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

  $(document).on('click', '.start-segment', function(e) {
    e.preventDefault();
    var $tr = $(this).closest('tr');
    var $firstInput = $tr.find('td:first-child input');
    var $secondInput = $tr.find('td:nth-child(2) input');
    var firstSensor = $firstInput.val();
    var secondSensor = $secondInput.val();
    var startTime = $('.carousel .item.active').data('timestamp');

    var $newTr = $('<tr></tr>').data({
      firstSensor: firstSensor,
      secondSensor: secondSensor,
      startTime: startTime
    });
    $('<td></td>').text(firstSensor).appendTo($newTr);
    $('<td></td>').text(secondSensor).appendTo($newTr);
    $('<td></td>').text(timeOfDay(startTime)).appendTo($newTr);
    $('<td><button class="btn btn-sm btn-primary end-segment">End</button></td>').appendTo($newTr);
    $newTr.insertAfter($tr);

    $firstInput.val('');
    $secondInput.val('');
  });

  $(document).on('click', '.end-segment', function(e) {
    e.preventDefault();
    var endTime = $('.carousel .item.active').data('timestamp');
    var $tr = $(this).closest('tr').data('endTime', endTime);
    $tr.find('td:last-child').text(timeOfDay(endTime));
  });

  $(document).on('click', '.export-segments', function(e) {
    var $segments = $('.sensors-list tr').not(':first-child');
    var csv = ["1st Sensor,2nd Sensor,Start Time,End Time"];
    $segments.each(function(i, tr) {
      var $tr = $(tr);
      var startTime = $tr.data('startTime');
      var endTime = $tr.data('endTime') || $('.carousel .item.active').data('timestamp');
      csv.push([
        $tr.data('firstSensor'),
        $tr.data('secondSensor'),
        startTime.toISOString(),
        endTime.toISOString()
      ].join(','))
    });
    $('#export-modal textarea').val(csv.join("\n"));
  });

  $(document).on('shown.bs.modal', '#export-modal', function() {
    $('#export-modal textarea').select();
  });

  $(document).on('focus', '#export-modal textarea', function(e) {
    $(this).select()
  });

  $(document).on('click', '#logout', function(e) {
    localStorage.removeItem('s3Credentials');
    document.location.reload();
  });

  function pathToLabel(path) {
    return path.replace(/\/$/, '').replace(/.*\//, '');
  }

  function load(s3Credentials, callback) {
    login(s3Credentials, function(err, s3) {
      if (err) {
        callback(err);
      } else {
        window.s3 = s3;
        listFolders(null, function(err, paths) {
          if (err) {
            callback(err);
          } else {
            var $classroomSelect = $('.classroom-select').removeClass('hidden').empty();
            $classroomSelect.append($('<option></option>').text('Select a classroom'));
            paths.forEach(function(path) {
              $classroomSelect.append($('<option></option>').val(path).text(pathToLabel(path)));
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

  function listFolders(prefix, callback) {
    var results = [];
    var params = {
      Delimiter: '/',
      Prefix: prefix
    };
    window.s3.listObjects(params, function(err, data) {
      data.CommonPrefixes.forEach(function(commonPrefix) {
        results.push(commonPrefix.Prefix.toString());
      });
      callback(null, results);
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
