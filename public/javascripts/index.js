

var index = (function(win,$) {
 // https://github.com/sail-sail/ejsExcel   excel表格
  function sendAjax() {
    var startTime = $('#startTime').val();
    var endTime = $('#endTime').val();
    if(!startTime) {
      alert('请选择开始时间');
      return false;
    }
    if(!endTime) {
      alert('请选择结束时间');
      return false;
    }
    startTime = new Date(startTime).setHours(0);
    startTime = new Date(startTime).setMinutes(0);
    startTime = new Date(startTime).setSeconds(0);
    endTime = new Date(endTime).setHours(23);
    endTime = new Date(endTime).setMinutes(59);
    endTime = new Date(endTime).setSeconds(59);
    $.ajax({
      url : '/index',
      type: 'post',
      data: {
        startTime: startTime,
        endTime: endTime
      },
      dataType: 'json',
      beforeSend: function() {
        $('#loading').show();
      },
      success : function(res) {
        render(res.data);
        console.log(res);
      },
     error:function(error){
        $('#loading').hide();
        alert('出错了，请刷新后重试');
     }
    });      
  }
  
  function render(data) {
    $('#loading').hide();
    var htmlArr = [];
    var collectionHtml = [];
    var obj = {};
    data.forEach(function(item,index) {
      var author = item.author;
      var wordage = item.wordage.match(/\d+/g)[0];
      if(obj[author]) {
        obj[author].push(wordage);
      } else {
        obj[author] = [wordage];
      }
    });

    for(k in obj) {
      var arr = obj[k];
      var num = 0;
      arr.forEach(function(item) {
        num += parseInt(item);
      });
      var html=     '<tr>'+
                    '<td>'+ k +'</td>'+
                    '<td>'+ obj[k].length +'</td>'+
                    '<td>'+ num +'</td>'+
                  '</tr>';
      collectionHtml.push(html);
    }
    $('#tbody2').html(collectionHtml.join(''));

    data.forEach(function(item,index) {
      var html=  '<tr>'+
                    '<td>'+ index +'</td>'+
                    '<td>'+ item.author +'</td>'+
                    '<td>'+ item.title +'</td>'+
                    '<td>'+ item.wordage +'</td>'+
                    '<td>'+ item.publishTime +'</td>'+
                  '</tr>';  
      htmlArr.push(html)  ;  
    });
    $('#tbody').html(htmlArr.join(''));
  }


  $('#submit').click(function() {
    sendAjax();
  });
      		  


})(window,jQuery)