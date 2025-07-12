import React, { useRef } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import './App.css';

import EntryPage from "./components/Entrypage";
import ScanResultsPage from "./App";

const AppRoutes = () => {
  const location = useLocation();
  const nodeRef = useRef(null); // Ref required to avoid findDOMNode issues

  return (
    <TransitionGroup>
      <CSSTransition
        key={location.pathname}
        classNames="slide"
        timeout={300}
        nodeRef={nodeRef}
        unmountOnExit
      >
        <div ref={nodeRef}>
          <Routes location={location}>
            <Route path="/" element={<EntryPage />} />
            <Route path="/scan" element={<ScanResultsPage />} />
          </Routes>
        </div>
      </CSSTransition>
    </TransitionGroup>
  );
};

export default AppRoutes;
