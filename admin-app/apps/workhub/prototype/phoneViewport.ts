/** The visible phone screen, including Safari's keyboard-induced viewport pan. */
export function phoneViewport(layoutHeight:number, height:number, top:number, scale:number, editing:boolean){
 return {height:Math.round(height),top:Math.round(top),keyboard:editing&&scale<1.1&&layoutHeight-height>120}
}
