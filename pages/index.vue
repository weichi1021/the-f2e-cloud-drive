<template lang="pug">
  .container(@click="hideContextMenu")
    el-container
      el-header
        .title Cloud Drive
        el-row(type="flex", justify="space-between", :gutter="5")
          el-col
            el-input(prefix-icon="el-icon-search", placeholder="Search Drive", v-model="search")
          el-col.text-right(:span="6")
            el-avatar {{ avatarDisplayName }}
      el-container
        el-aside(width="185px")
          ul.aside-menu
            li.list-btn
              el-dropdown(placement="bottom-start")
                el-button(type="default", icon="el-icon-plus") New
                el-dropdown-menu(slot="dropdown")
                  el-dropdown-item
                    el-upload(:multiple="false", action="", :show-file-list="false" :on-success="fileUploadStorageHandler") File upload
            li(:class="{active: menuActive == 'My Drive'}", @click="menuActiveHandler('My Drive')")
              i.el-icon-files
              span My Drive
            li(:class="{active: menuActive == 'Recent'}", @click="menuActiveHandler('Recent')")
              i.el-icon-time
              span Recent
            li(:class="{active: menuActive == 'Starred'}", @click="menuActiveHandler('Starred')")
              i.el-icon-star-off
              span Starred
            li(:class="{active: menuActive == 'Trash'}", @click="menuActiveHandler('Trash')")
              i.el-icon-delete
              span Trash
        el-main
          .main-title {{ menuActive }}
          el-table(:data="mainData", style="width: 100%", oncontextmenu="return false;", @row-contextmenu="showContextMenu")
            el-table-column(prop="display_name", label="Name", :sortable="true")
              template(slot-scope="scope")
                i(:class="displayIcon(scope.row.type)")
                span &nbsp;&nbsp;{{ scope.row.display_name }}
            el-table-column(prop="size", label="File size", width="120")
            el-table-column(prop="type", label="File type", width="140")
            el-table-column(prop="last_modify_time", label="Last modified", :sortable="true", width="140")
          ul#context-menu
            li
              i.el-icon-star-off
              span &nbsp;&nbsp;Add to Starred
            li(@click="downloadFileHandler")
              i.el-icon-download
              span &nbsp;&nbsp;Download
            li(@click="removeFileHandler")
              i.el-icon-delete
              span &nbsp;&nbsp;Remove
</template>

<script>
  import firebase from '@/plugins/firebase';

  const userProfileRef = firebase.firestore().collection('user-profile');
  const filesRef = firebase.firestore().collection('files');
  const storageRef = firebase.storage().ref();

  export default {
    head() {
      return {
        title: 'My Drive',
        titleTemplate: '%s | Cloud Drive'
      }
    },
    data() {
      return {
        search: '',
        menuActive: 'My Drive',
        userProfile: {},
        mainData: [
          {"id":"1","display_name":"1day.pdf","is_active":true,"last_modify_time":"2019/9/4","path":"Test/1day.pdf","size":"220.74 KB","type":"application/pdf"}, {"id":"2","display_name":"2day.pdf","is_active":true,"last_modify_time":"2019/9/2","path":"Test/2day.pdf","size":"220.74 KB","type":"application/pdf"}, {"id":"3","display_name":"3day.pdf","is_active":true,"last_modify_time":"2019/9/10","path":"Test/3day.pdf","size":"220.74 KB","type":"application/pdf"}
        ],
        clickedData: {},
      }
    },
    created() {
      this.getUserProfile();
      this.getFolder();
    },
    computed: {
      avatarDisplayName() {
        const { display_name } = this.userProfile;
        let avatarName = display_name || 'A'
        return avatarName.substr(0, 1).toLocaleUpperCase()
      }
    },
    methods: {
      // handler
      menuActiveHandler(name) {
        this.menuActive = name;
      },
      async fileUploadStorageHandler(response, file) {
        try{
          console.log(file)
          var mountainsRef = storageRef.child(`${this.userProfile.display_name}/${file.name}`);
          await mountainsRef.put(file.raw, {contentType: file.type})
          this.fileUploadDBHandler(file.raw)
        }catch(err){
          console.log(err);
        }
      },
      fileUploadDBHandler(file) {
        try{
          const data = {
            display_name: file.name,
            type: file.type,
            size: file.size,
            size_display_name: this.formatByte(file.size),
            is_active: true,
            is_starred: false,
            path: `${this.userProfile.display_name}/${file.name}`,
            last_modify_time: this.getTodayDate()
          };
          const resp = filesRef.doc().set(data)
          this.mainData.push(data)
        }catch(err){
          console.log(err);
        }
      },
      removeFileHandler() {
        try{
          var desertRef = storageRef.child(this.clickedData.path);
          desertRef.delete()
        }catch(err){
          console.log(err)
        }
        try{
          filesRef.doc(this.clickedData.id).delete();
        }catch(err){
          console.log(err)
        }
      },
      async downloadFileHandler() {
        try{
          const url = await storageRef.child(this.clickedData.path).getDownloadURL();
          console.log(url)
          // location.href = url
          var xhr = new XMLHttpRequest();
          xhr.responseType = 'blob';
          xhr.onload = function(event) {
            var blob = xhr.response;
            console.log(blob)
          };
          xhr.open('GET', url);
          xhr.send();
          console.log(xhr)
        }catch(err){
          console.log(err)
        }
        // storageRef.child(this.clickedData.path).getDownloadURL().then(function(url) {

        //   // // Or inserted into an <img> element:
        //   // var img = document.getElementById('myimg');
        //   // img.src = url;
        // })
      },
      // firebase
      async getUserProfile() {
        try{
          const querySnapshot = await userProfileRef.get()
          const mapData = querySnapshot.docs.map(doc => { return { id: doc.id, ...doc.data() } });
          this.userProfile = mapData[0];
          console.log('get user = %o', this.userProfile)
        }catch(err){
          console.log(err);
        }
      },
      async getFolder() {
        try{
          const querySnapshot = await filesRef.get()
          this.mainData = querySnapshot.docs.map(doc => { return { id: doc.id, ...doc.data() } });
          console.log('get folder = %o', this.mainData)
        }catch(err){
          console.log(err);
        }
      }, 
      // context menu
      showContextMenu(row, column, event) {
        console.log(row, column, event)
        this.clickedData = row;
        const clickCoords = this.getPosition(event);
        const menu = document.getElementById('context-menu');
        const menuWidth = menu.offsetWidth + 4;
        const menuHeight = menu.offsetHeight + 4;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if ( (windowWidth - clickCoords.x) < menuWidth ) {
          menu.style.left = windowWidth - menuWidth + "px";
        } else {
          menu.style.left = clickCoords.x + "px";
        }

        if ( (windowHeight - clickCoords.y) < menuHeight ) {
          menu.style.top = windowHeight - menuHeight + "px";
        } else {
          menu.style.top = clickCoords.y + "px";
        }
        document.getElementById("context-menu").classList.add('active');
      },
      hideContextMenu() {
        console.log('hide')
        document.getElementById("context-menu").classList.remove('active');
      },
      // get function
      displayIcon(type) {
        const isPDF = /pdf/.test(type);
        const isImage = /image/.test(type);
        if(isImage) return 'el-icon-picture'
        if(isPDF) return 'el-icon-s-order'
        return 'el-icon-info'
      },
      getPosition(e) {
        var posx = 0;
        var posy = 0;

        if (!e) var e = window.event;

        if (e.pageX || e.pageY) {
          posx = e.pageX;
          posy = e.pageY;
        } else if (e.clientX || e.clientY) {
          posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
          posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }

        return {
          x: posx,
          y: posy
        }
      },
      getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() > 9)? today.getMonth(): `0${today.getMonth()}`;
        const day = (today.getDate() > 9)? today.getDate(): `0${today.getDate()}`;
        return `${year}/${month}/${day}}`
      },
      formatByte(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
      },
    },
  }
</script>

<style lang="sass" scoped>
  .container
    max-width: 1040px
    margin: 0 auto
    min-height: 100vh
    color: #606266
  .el-header
    height: 70px !important
    padding: 15px 30px
    margin-top: 10px
    margin-bottom: 20px
    border-bottom: 1px solid #E4E7ED
  .title
    float: left
    font-size: 24px
    line-height: 40px
    margin-right: 30px
  ul.nav, ul.aside-menu, ul#context-menu
    list-style-type: none
    margin: 0px
    padding: 0px
  ul.nav
    float: right
    li
      float: left
    li + li
      margin-left: 15px
  ul.aside-menu li
    cursor: default
    padding: 10px 40px
    i
      margin-right: 8px
  ul.aside-menu li.list-btn
    padding: 0px 40px 10px
  ul.aside-menu li:not(.list-btn):hover
    background-color: rgba(#409EFF, 0.2)
  ul.aside-menu li.active
    color: #409EFF
  .el-main
    padding: 0px 20px
    .main-title
      font-size: 16px
      padding-bottom: 15px
      margin-bottom: 10px
      border-bottom: 1px solid #E4E7ED
  ul#context-menu
    display: none;
    position: absolute
    padding: 5px 0px !important
    z-index: 9
    box-shadow: 0 2px 12px 0 rgba(0,0,0,.1)
    background-color: #fff
    border: 1px solid #ebeef5
    border-radius: 4px
    li
      line-height: 36px
      padding: 0 20px
      margin: 0
      font-size: 14px
      color: #606266
      cursor: pointer
      outline: none
    li:hover
      background-color: #ecf5ff
      color: #66b1ff
  ul#context-menu.active
    display: block
</style>
