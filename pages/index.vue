<template lang="pug">
  .container(v-loading="isLoading", @click="hideContextMenu")
    el-container
      el-header
        .title Cloud Drive
        el-row(type="flex", justify="space-between", :gutter="5")
          el-col
            el-input(prefix-icon="el-icon-search", placeholder="Search Drive", v-model="search")
          el-col.text-right(:span="6")
            el-avatar User
      el-container
        el-aside(width="185px")
          ul.aside-menu
            li.list-btn
              el-dropdown(placement="bottom-start")
                el-button(type="default", icon="el-icon-plus") New
                el-dropdown-menu(slot="dropdown")
                  el-dropdown-item
                    el-upload(:multiple="false", action="", :show-file-list="false", :before-upload="beforeUpload", :on-success="uploadFileHandler") File upload
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
            el-divider
            li.list-btn
              i.el-icon-box
              span Storage
              el-progress(:percentage="storageSizePercent" :stroke-width="3" :show-text="false")
              span.small-text {{ storageDisplayName }}
        el-main
          .main-title {{ menuActive }}
          el-table(:data="filterMainData", style="width: 100%", oncontextmenu="return false;", unselectable="on", @row-contextmenu="showContextMenu", @row-click="previewFileHandler")
            el-table-column(prop="display_name", label="Name", :sortable="(menuActive == 'My Drive')")
              template(slot-scope="scope")
                i(:class="displayIcon(scope.row.type)")
                span &nbsp;&nbsp;{{ scope.row.display_name }}&nbsp;
                i.el-icon-star-on(v-if="scope.row.is_starred && (menuActive !== 'Starred') && ((menuActive !== 'Trash'))")
            el-table-column(prop="size_display_name", label="File size", width="120")
            el-table-column(prop="type", label="File type", width="140")
            el-table-column(prop="last_modify_time", label="Last modified", :sortable="(menuActive == 'My Drive')", width="140")
          ul#context-menu
            li(@click="previewFileHandler", v-if="menuActive !== 'Trash'")
              i.el-icon-view
              span &nbsp;&nbsp;Preview
            li(@click="starredFileHandler", v-if="menuActive !== 'Trash'")
              i.el-icon-star-off
              span &nbsp;&nbsp;{{ starredDisplayName }}
            li(@click="activeFileHandler(false)", v-if="menuActive !== 'Trash'")
              i.el-icon-delete
              span &nbsp;&nbsp;Remove
            li(@click="activeFileHandler(true)", v-if="menuActive == 'Trash'")
              i.el-icon-refresh-left
              span &nbsp;&nbsp;Restore
            li(@click="removeFileHandler", v-if="menuActive == 'Trash'")
              i.el-icon-delete
              span &nbsp;&nbsp;Remove Forever
</template>

<script>
  import firebase from '@/plugins/firebase';

  const userProfileRef = firebase.firestore().collection('user-profile');
  const filesRef = firebase.firestore().collection('files');
  const storageRef = firebase.storage().ref();

  export default {
    head() {
      return {
        title: this.menuActive,
        titleTemplate: '%s | Cloud Drive'
      }
    },
    data() {
      return {
        isLoading: true,
        search: '',
        menuActive: 'My Drive',
        userProfile: {},
        mainData: [],
        clickedData: {},
        totalSize: 0,
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
      },
      storageDisplayName() {
        const is1MB = 1024*1024;
        return `${this.formatByte(this.totalSize)} of ${this.formatByte(is1MB)} used`
      },
      storageSizePercent() {
        const is1MB = 1024*1024;
        return Math.floor(this.totalSize / is1MB * 100)
      },
      starredDisplayName() {
        return (!this.clickedData.is_starred)? `Add to Starred` : `Remove from Starred`
      },
      filterMainData() {
        return this.mainData.filter(item => {
            const searchLowerCase = this.search.toLocaleLowerCase();
            const isSearch = (item.display_name.toLocaleLowerCase().indexOf(searchLowerCase) !== -1) || (!searchLowerCase)
            const isMyDrive = (this.menuActive == 'My Drive' && item.is_active && isSearch)
            const isStarred = (this.menuActive == 'Starred' && item.is_active && item.is_starred && isSearch)
            const isRecent = (this.menuActive == 'Recent' && item.is_active && isSearch)
            const isTrash = (this.menuActive == 'Trash' && !item.is_active && isSearch)
            return isMyDrive || isStarred || isRecent || isTrash
          }).sort((a, b) => {
            const isRecent = (this.menuActive == 'Recent')
            if(isRecent){
              const nameA = a.last_modify_time.toUpperCase(); // ignore upper and lowercase
              const nameB = b.last_modify_time.toUpperCase(); // ignore upper and lowercase
              if (nameA < nameB) {
                return 1;
              }
              if (nameA > nameB) {
                return -1;
              }
            }

            // names must be equal
            return 0;
        });
      },
    },
    methods: {
      // handler
      menuActiveHandler(name) {
        this.menuActive = name;
      },
      // upload
      beforeUpload(file) {
        const isLt1M = ((this.totalSize + file.size) / 1024 / 1024) < 1;
        return isLt1M;
      },
      async uploadFileHandler(response, file){
        await this.uploadFileStorage(file)
        this.uploadFileDB(file.raw)
        this.menuActiveHandler('My Drive')
      },
      async uploadFileStorage(file) {
        try{
          console.log(file)
          var mountainsRef = storageRef.child(`${this.userProfile.display_name}/${file.name}`);
          await mountainsRef.put(file.raw, {contentType: file.type})
          this.getFolder()
        }catch(err){
          console.log(err);
        }
      },
      async uploadFileDB(file) {
        try{
          const path = `${this.userProfile.display_name}/${file.name}`;
          const url = await storageRef.child(path).getDownloadURL();
          const data = {
            display_name: file.name,
            type: file.type,
            size: file.size,
            size_display_name: this.formatByte(file.size),
            is_active: true,
            is_starred: false,
            path: path,
            file_url: url,
            last_modify_time: this.getTodayDate()
          };
          const resp = filesRef.doc().set(data)
          this.mainData.push(data)
          this.getTotalSize()
        }catch(err){
          console.log(err);
        }
      },
      // remove
      removeFileHandler() {
        this.removeFileStorage();
        this.removeFileDB();
      },
      removeFileStorage() {
        try{
          var desertRef = storageRef.child(this.clickedData.path);
          desertRef.delete()
        }catch(err){
          console.log(err)
        }
      },
      removeFileDB() {
        try{
          filesRef.doc(this.clickedData.id).delete();
          const findIndex = this.mainData.findIndex(item => item.id == this.clickedData.id)
          if(findIndex !== undefined){
            this.mainData.splice(findIndex, 1)
            this.getTotalSize();
          }
        }catch(err){
          console.log(err)
        }
      },
      activeFileHandler(active) {
        try{
          console.log(this.clickedData.id)
          filesRef.doc(this.clickedData.id).update({ is_active: active });
          const findIndex = this.mainData.findIndex(item => item.id == this.clickedData.id)
          if(findIndex !== undefined){
            this.mainData[findIndex].is_active = active
          }
        }catch(err){
          console.log(err)
        }
      },
      // preview
      async previewFileHandler(row) {
        const item = (!!row)? row: this.clickedData;
        if(!!item.file_url){
          window.open(item.file_url, '_blank')
        }else{
          try{
            const url = await storageRef.child(item.path).getDownloadURL();
            window.open(url, '_blank')
          }catch(err){
            console.log(err)
          }
        }
      },
      // starred
      starredFileHandler() {
        try{
          filesRef.doc(this.clickedData.id).update({ is_starred: !this.clickedData.is_starred });
          const findIndex = this.mainData.findIndex(item => item.id == this.clickedData.id)
          if(findIndex !== undefined){
            this.mainData[findIndex].is_starred = !this.mainData[findIndex].is_starred
          }
        }catch(err){
          console.log(err)
        }
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
          this.getTotalSize();
          this.isLoading = false;
          console.log('get folder = %o', this.mainData)
        }catch(err){
          console.log(err);
        }
      },
      getTotalSize() {
        this.totalSize = this.mainData.reduce((accumulator, currentItem) => { return accumulator + currentItem.size }, 0)
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
        document.getElementById('context-menu').classList.remove('active');
        Object.assign(this.$data.clickedData, this.$options.data.clickedData)
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
        return `${year}/${month}/${day}`
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
    padding: 15px 20px
    margin-top: 10px
    margin-bottom: 20px
    border-bottom: 1px solid #E4E7ED
  .title
    float: left
    font-size: 24px
    line-height: 40px
    margin-right: 60px
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
  ul.aside-menu
    li, li.list-btn
      cursor: default
      padding: 10px 20px
      i
        margin-right: 8px
    .el-divider
      margin: 8px 0px
    .el-progress
      margin: 12px 0px 5px
    .small-text
      font-size: 11px
  ul.aside-menu li:not(.list-btn):hover
    background-color: rgba(#409EFF, 0.2)
  ul.aside-menu li.active
    color: #409EFF
  .el-main
    padding: 0px 20px
    .main-title
      font-size: 16px
      padding: 0px 10px 15px
      margin-bottom: 10px
      border-bottom: 1px solid #E4E7ED
    .el-table
      -webkit-user-select: none
      -moz-user-select: none
  ul#context-menu
    -webkit-user-select: none
    -moz-user-select: none
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
