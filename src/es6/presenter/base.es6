import {d3} from "nbpresent-deps";

import {SpeakerBase} from "../speaker/base";

import {ThemeBase} from "../theme/base";

import {ManualLayout} from "../layout/manual";
import {TreemapLayout} from "../layout/treemap";
import {GridLayout} from "../layout/grid";

import {PART, PART_SELECT} from "../parts";

let PREFIX = [
  "-webkit-",
  "-moz-",
  "-ms-",
  "-o-",
  ""
];

export class Presenter {
  constructor(tree) {
    this.tree = tree;

    this.slides = tree.select(["sortedSlides"]);

    this.cellManager = this.makeCellManager();
    this.speaker = this.makeSpeaker(this.tree);

    this.initUI();

    this.themes = this.tree.select(["themes"]);
    this.presenting = this.tree.select(["app", "presenting"]);
    this.current = this.tree.select(["app", "selectedSlide"]);

    this.presenting.on("update", () => this.present());


    [this.slides, this.current, this.themes]
      .map(({on})=> on("update", () => this.update()));
  }

  makeCellManager() {
    throw new Error("Not implemented");
  }


  makeSpeaker(tree){
    return new SpeakerBase(tree);
  }

  initUI(){
    this.$ui = d3.select("body")
      .append("div")
      .classed({"nbp-presenter": 1});

    d3.select(window).on("mousemove", ()=> this.speaker.hint());

    this.$style = d3.select("head")
      .append("style")
      .classed({"nbp-presenter-style": 1});

    this.$backgrounds = this.$ui.append("div")
      .classed({"nbp-presenter-backgrounds": 1});
  }

  initActions(){

  }

  deinitActions(){

  }

  /** Decode the slide object through the registry of layout classes.
    * @param {Object} slide - the key, value of the current slide
    * @return {Class} */
  layoutClass(slide){
    // TODO: refactor this into plugin mechanism
    return {
      manual: ManualLayout,
      treemap: TreemapLayout,
      grid: GridLayout
    }[slide.value.layout || "manual"];
  }

  /** Initialize the layout
    * @param {Object} slide - the immutable data of the current slide
    * @return {RegionTree} */
  updateLayout(slide){
    let LayoutClass = this.layoutClass(slide);

    if(this.layout &&
      this.layout.key() == LayoutClass.clsKey() &&
      this.layout.slide.key === slide.key
    ){
      this.layout.slide = slide;
    }else{
      this.layout = new LayoutClass(
        this.tree,
        slide,
        document.documentElement
      );
    }
    this.layout.init();
    return this;
  }


  themeClass(slide){
    // TODO: refactor this into plugin mechanism?
    return ThemeBase;
  }

  updateTheme(slide){
    let ThemeClass = this.themeClass(slide),
      themeId = slide.theme || this.themes.get(["default"]);

    if(!themeId){
      let themes = d3.values(this.themes.get(["theme"]) || {});

      themeId = themes.length ? themes[0].id : null;
    }

    themeId = themeId || "<default>";

    this.theme = new ThemeClass(
      this.themes.select(["theme", themeId]),
      slide,
      this.$style
    );

    this.theme.init();

    return this;
  }

  present() {
    if(!this.presenting.get()){
      this.deinitActions();
    }else{
      this.initActions();
    }
    this.update();
  }

  getCells() {
    return this.cellManager.getCells();
  }

  update() {
    const presenting = this.presenting.get();

    let that = this;

    d3.select("body").classed({"nbp-presenting": presenting});

    let current = this.current.get(),
      slide = this.slides.get([{key: current}]);

    // TODO: handle cleanup
    // transition = this.layout && this.layout.destroy()

    if(!slide){
      return this.current.set(this.slides.get([0, "key"]));
    }

    this.updateLayout(slide)
      .updateTheme(slide);

    if(!presenting){
      return this.clean(true);
    }

    let cells = this.getCells();

    d3.selectAll(this.allPartSelect())
      .classed({"nbp-unpresent": 1, "nbp-present": 0});

    d3.entries(slide.value.regions)
      .filter(({value}) => value.content)
      .map((region) => {
        let {content} = region.value,
          cell = cells[content.cell];

        if(!cell){
          return;
        }

        let $el = d3.select(cell.element[0]),
          part = content.part === PART.whole ?
            $el :
            $el.select(PART_SELECT[content.part]),
          regionCls = `nbp-region-${region.key}`;

        part
          .classed(regionCls, 1)
          .classed({
            "nbp-unpresent": 0,
            "nbp-present": 1
          })
          .each(() => that.theme.update(region, part))
          .each(() => that.layout.update(region, part));
      });



    this.clean();
  }

  allPartSelect(){
    return d3.entries(PART_SELECT)
      .filter(({value}) => value)
      .map(({value}) => `.cell ${value}`)
      .concat([".cell"])
      .join(", ");
  }

  clean(force){
    let that = this;

    if(force){
      d3.selectAll(this.allPartSelect())
        .classed({"nbp-unpresent": 1, "nbp-present": 0});
    }

    d3.selectAll(".nbp-unpresent")
      .call(that.layout && this.layout.clean || (() => 0))
      .classed({"nbp-unpresent": 0, "nbp-present": 0});
  }
}
